-- Phase 15: Scoring Engine integration
-- Update assign_lead() to accept optional p_order_id from TypeScript scoring engine.
-- When p_order_id is provided, skip ORDER BY query and assign directly.
-- When NULL, fall back to old weighted rotation (backward compatibility).

CREATE OR REPLACE FUNCTION assign_lead(p_lead_id uuid, p_order_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_order orders%ROWTYPE;
  v_reason text;
  v_webhook_url text;
  v_payload jsonb;
  v_delivery_id uuid;
  v_delivery_ids jsonb := '[]'::jsonb;
  v_methods text[];
  v_ghl_contact_id text;
  v_delivery_status text;
BEGIN
  PERFORM pg_advisory_xact_lock(1, 0);

  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'lead_not_found');
  END IF;

  IF p_order_id IS NOT NULL THEN
    -- Scoring path: TypeScript already picked the winner
    SELECT * INTO v_order FROM orders WHERE id = p_order_id AND status = 'active';

    -- Race condition guard: order may have completed between scoring and lock acquisition
    IF NOT FOUND THEN
      -- Fall through to unassigned path
      v_order := NULL;
    END IF;

    -- Race condition guard: order may have run out of capacity
    IF v_order IS NOT NULL AND v_order.leads_remaining <= 0 AND v_order.bonus_mode = false THEN
      v_order := NULL;
    END IF;
  END IF;

  -- Fallback path: no p_order_id provided, or scored order became unavailable
  IF p_order_id IS NULL OR v_order IS NULL THEN
    IF p_order_id IS NULL THEN
      -- Legacy weighted rotation (backward compatibility)
      SELECT o.* INTO v_order
      FROM orders o
      JOIN brokers b ON b.id = o.broker_id
      WHERE o.status = 'active'
        AND b.assignment_status = 'active'
        AND (v_lead.vertical = ANY(o.verticals) OR 'All' = ANY(o.verticals))
        AND (o.credit_score_min IS NULL OR v_lead.credit_score >= o.credit_score_min)
        AND (o.leads_remaining > 0 OR o.bonus_mode = true)
      ORDER BY
        (o.leads_remaining::float / GREATEST(o.total_leads, 1)) DESC,
        o.last_assigned_at ASC NULLS FIRST
      LIMIT 1;
    END IF;
  END IF;

  -- Unassigned path
  IF v_order IS NULL THEN
    v_reason := build_match_failure_reason(v_lead);

    UPDATE leads
    SET status = 'unassigned', updated_at = now()
    WHERE id = p_lead_id;

    INSERT INTO unassigned_queue (lead_id, reason, details)
    VALUES (p_lead_id, 'no_matching_order', v_reason);

    INSERT INTO activity_log (event_type, lead_id, details)
    VALUES (
      'lead_unassigned',
      p_lead_id,
      jsonb_build_object(
        'reason', v_reason,
        'vertical', v_lead.vertical,
        'credit_score', v_lead.credit_score
      )
    );

    RETURN jsonb_build_object('status', 'unassigned', 'reason', v_reason);
  END IF;

  -- Assign the lead
  UPDATE leads
  SET assigned_broker_id = v_order.broker_id,
      assigned_order_id = v_order.id,
      assigned_at = now(),
      status = 'assigned',
      updated_at = now()
  WHERE id = p_lead_id;

  UPDATE orders
  SET leads_delivered = leads_delivered + 1,
      leads_remaining = CASE
        WHEN bonus_mode THEN leads_remaining
        ELSE leads_remaining - 1
      END,
      last_assigned_at = now()
  WHERE id = v_order.id;

  UPDATE orders
  SET status = 'completed'
  WHERE id = v_order.id
    AND leads_remaining <= 0
    AND bonus_mode = false;

  INSERT INTO activity_log (event_type, lead_id, broker_id, order_id, details)
  VALUES (
    'lead_assigned',
    p_lead_id,
    v_order.broker_id,
    v_order.id,
    jsonb_build_object(
      'vertical', v_lead.vertical,
      'credit_score', v_lead.credit_score,
      'leads_remaining', v_order.leads_remaining - CASE WHEN v_order.bonus_mode THEN 0 ELSE 1 END,
      'bonus_mode', v_order.bonus_mode
    )
  );

  -- Build shared payload
  v_payload := jsonb_build_object(
    'lead_id', v_lead.id,
    'first_name', v_lead.first_name,
    'last_name', v_lead.last_name,
    'email', v_lead.email,
    'phone', v_lead.phone,
    'business_name', v_lead.business_name,
    'vertical', v_lead.vertical,
    'credit_score', v_lead.credit_score,
    'funding_amount', v_lead.funding_amount,
    'funding_purpose', v_lead.funding_purpose,
    'state', v_lead.state,
    'ai_call_notes', v_lead.ai_call_notes,
    'ai_call_status', v_lead.ai_call_status,
    'ghl_contact_id', v_lead.ghl_contact_id,
    'assigned_at', now(),
    'order_id', v_order.id,
    'broker_id', v_order.broker_id
  );

  -- Fetch broker delivery config
  SELECT delivery_methods, crm_webhook_url, ghl_contact_id
  INTO v_methods, v_webhook_url, v_ghl_contact_id
  FROM brokers WHERE id = v_order.broker_id;

  v_methods := COALESCE(v_methods, ARRAY[]::text[]);

  -- Determine delivery status based on broker contact hours
  v_delivery_status := CASE
    WHEN is_within_contact_hours(v_order.broker_id) THEN 'pending'
    ELSE 'queued'
  END;

  -- Insert delivery row for each channel
  IF 'crm_webhook' = ANY(v_methods) AND v_webhook_url IS NOT NULL AND v_webhook_url != '' THEN
    INSERT INTO deliveries (lead_id, broker_id, order_id, channel, target_url, payload, status)
    VALUES (p_lead_id, v_order.broker_id, v_order.id, 'crm_webhook', v_webhook_url, v_payload, v_delivery_status)
    RETURNING id INTO v_delivery_id;
    v_delivery_ids := v_delivery_ids || to_jsonb(v_delivery_id);
  END IF;

  IF 'email' = ANY(v_methods) AND v_ghl_contact_id IS NOT NULL THEN
    INSERT INTO deliveries (lead_id, broker_id, order_id, channel, ghl_contact_id, payload, status)
    VALUES (p_lead_id, v_order.broker_id, v_order.id, 'email', v_ghl_contact_id, v_payload, v_delivery_status)
    RETURNING id INTO v_delivery_id;
    v_delivery_ids := v_delivery_ids || to_jsonb(v_delivery_id);
  END IF;

  IF 'sms' = ANY(v_methods) AND v_ghl_contact_id IS NOT NULL THEN
    INSERT INTO deliveries (lead_id, broker_id, order_id, channel, ghl_contact_id, payload, status)
    VALUES (p_lead_id, v_order.broker_id, v_order.id, 'sms', v_ghl_contact_id, v_payload, v_delivery_status)
    RETURNING id INTO v_delivery_id;
    v_delivery_ids := v_delivery_ids || to_jsonb(v_delivery_id);
  END IF;

  RETURN jsonb_build_object(
    'status', 'assigned',
    'broker_id', v_order.broker_id,
    'order_id', v_order.id,
    'delivery_ids', v_delivery_ids,
    'delivery_status', v_delivery_status
  );
END;
$$;
