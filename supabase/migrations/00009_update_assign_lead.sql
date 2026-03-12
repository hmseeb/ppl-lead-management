-- Migration: Update assign_lead() to insert webhook_deliveries record on assignment.
-- Replaces the existing function from 00006. The only change is the webhook delivery
-- block added after the activity_log insert in the "assigned" path.

CREATE OR REPLACE FUNCTION assign_lead(p_lead_id uuid)
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
BEGIN
  -- Global advisory lock: namespace=1, id=0
  -- Uses two-integer form to avoid collision with GoTrue's single-bigint locks.
  -- Serializes ALL assignment decisions for globally consistent rotation.
  PERFORM pg_advisory_xact_lock(1, 0);

  -- Fetch the lead
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'lead_not_found');
  END IF;

  -- Find best matching active order using weighted rotation
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

  -- No matching order: queue as unassigned
  IF NOT FOUND THEN
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

  -- Matching order found: assign the lead
  UPDATE leads
  SET assigned_broker_id = v_order.broker_id,
      assigned_order_id = v_order.id,
      assigned_at = now(),
      status = 'assigned',
      updated_at = now()
  WHERE id = p_lead_id;

  -- Update order counters
  UPDATE orders
  SET leads_delivered = leads_delivered + 1,
      leads_remaining = CASE
        WHEN bonus_mode THEN leads_remaining
        ELSE leads_remaining - 1
      END,
      last_assigned_at = now()
  WHERE id = v_order.id;

  -- Auto-complete check: if leads_remaining hit 0 and not bonus mode
  UPDATE orders
  SET status = 'completed'
  WHERE id = v_order.id
    AND leads_remaining <= 0
    AND bonus_mode = false;

  -- Log the assignment
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

  -- ============================================================
  -- Webhook delivery: fire lead data to broker's CRM
  -- ============================================================
  SELECT crm_webhook_url INTO v_webhook_url
  FROM brokers WHERE id = v_order.broker_id;

  IF v_webhook_url IS NOT NULL AND v_webhook_url != '' THEN
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

    INSERT INTO webhook_deliveries (lead_id, broker_id, order_id, target_url, payload)
    VALUES (p_lead_id, v_order.broker_id, v_order.id, v_webhook_url, v_payload)
    RETURNING id INTO v_delivery_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'assigned',
    'broker_id', v_order.broker_id,
    'order_id', v_order.id,
    'delivery_id', v_delivery_id
  );
END;
$$;
