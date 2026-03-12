-- Migration: assign_lead() and build_match_failure_reason()
-- The atomic heart of the lead assignment engine.
-- Uses advisory locks to serialize all assignment decisions.

-- =============================================================
-- Part A: Helper function for detailed match failure reasons
-- =============================================================

CREATE OR REPLACE FUNCTION build_match_failure_reason(p_lead leads)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_active_count integer;
  v_vertical_orders integer;
  v_credit_orders integer;
  v_remaining_orders integer;
  v_broker_orders integer;
  v_verticals text;
  v_closest_order_id uuid;
  v_closest_min integer;
  v_broker_names text;
BEGIN
  -- 1. Any active orders at all?
  SELECT count(*) INTO v_active_count
  FROM orders WHERE status = 'active';

  IF v_active_count = 0 THEN
    RETURN 'No active orders in the system';
  END IF;

  -- 2. Any active orders matching lead's vertical?
  SELECT count(*) INTO v_vertical_orders
  FROM orders
  WHERE status = 'active'
    AND (p_lead.vertical = ANY(verticals) OR 'All' = ANY(verticals));

  IF v_vertical_orders = 0 THEN
    SELECT string_agg(DISTINCT unnested, ', ')
    INTO v_verticals
    FROM orders, unnest(verticals) AS unnested
    WHERE status = 'active';

    RETURN format(
      'No active orders accept vertical ''%s''. Active order verticals: %s',
      COALESCE(p_lead.vertical, 'NULL'),
      COALESCE(v_verticals, 'none')
    );
  END IF;

  -- 3. Any vertical-matching orders where lead meets credit score min?
  SELECT count(*) INTO v_credit_orders
  FROM orders
  WHERE status = 'active'
    AND (p_lead.vertical = ANY(verticals) OR 'All' = ANY(verticals))
    AND (credit_score_min IS NULL OR p_lead.credit_score >= credit_score_min);

  IF v_credit_orders = 0 THEN
    SELECT o.id, o.credit_score_min
    INTO v_closest_order_id, v_closest_min
    FROM orders o
    WHERE o.status = 'active'
      AND (p_lead.vertical = ANY(o.verticals) OR 'All' = ANY(o.verticals))
      AND o.credit_score_min IS NOT NULL
    ORDER BY o.credit_score_min ASC
    LIMIT 1;

    RETURN format(
      'Lead credit score %s is below all matching order minimums. Closest: %s requires %s',
      COALESCE(p_lead.credit_score::text, 'NULL'),
      COALESCE(v_closest_order_id::text, 'unknown'),
      COALESCE(v_closest_min::text, 'unknown')
    );
  END IF;

  -- 4. Any matching orders with leads_remaining > 0 or bonus_mode?
  SELECT count(*) INTO v_remaining_orders
  FROM orders
  WHERE status = 'active'
    AND (p_lead.vertical = ANY(verticals) OR 'All' = ANY(verticals))
    AND (credit_score_min IS NULL OR p_lead.credit_score >= credit_score_min)
    AND (leads_remaining > 0 OR bonus_mode = true);

  IF v_remaining_orders = 0 THEN
    RETURN 'All matching orders are fully delivered (0 remaining, no bonus mode)';
  END IF;

  -- 5. Any matching brokers that are active?
  SELECT count(*) INTO v_broker_orders
  FROM orders o
  JOIN brokers b ON b.id = o.broker_id
  WHERE o.status = 'active'
    AND b.assignment_status = 'active'
    AND (p_lead.vertical = ANY(o.verticals) OR 'All' = ANY(o.verticals))
    AND (o.credit_score_min IS NULL OR p_lead.credit_score >= o.credit_score_min)
    AND (o.leads_remaining > 0 OR o.bonus_mode = true);

  IF v_broker_orders = 0 THEN
    SELECT string_agg(DISTINCT b.first_name || ' ' || b.last_name, ', ')
    INTO v_broker_names
    FROM orders o
    JOIN brokers b ON b.id = o.broker_id
    WHERE o.status = 'active'
      AND b.assignment_status != 'active'
      AND (p_lead.vertical = ANY(o.verticals) OR 'All' = ANY(o.verticals))
      AND (o.credit_score_min IS NULL OR p_lead.credit_score >= o.credit_score_min)
      AND (o.leads_remaining > 0 OR o.bonus_mode = true);

    RETURN format(
      'Matching orders exist but their brokers are paused/completed: %s',
      COALESCE(v_broker_names, 'unknown')
    );
  END IF;

  -- 6. Fallback (should never happen)
  RETURN 'No match found (unknown reason)';
END;
$$;

-- =============================================================
-- Part B: Main assignment function
-- =============================================================

CREATE OR REPLACE FUNCTION assign_lead(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_order orders%ROWTYPE;
  v_reason text;
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

  RETURN jsonb_build_object(
    'status', 'assigned',
    'broker_id', v_order.broker_id,
    'order_id', v_order.id
  );
END;
$$;
