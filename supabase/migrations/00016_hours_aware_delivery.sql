-- Migration: Hours-aware delivery
-- Adds 'queued' status, is_within_contact_hours() helper, updates assign_lead()
-- to set delivery status based on broker contact hours, and updates triggers
-- to skip queued rows.

-- ============================================================
-- 1. Add 'queued' to deliveries status CHECK constraint
-- ============================================================

-- Drop the original CHECK constraint (created as webhook_deliveries_status_check in 00007)
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS webhook_deliveries_status_check;

-- Add updated CHECK with 'queued'
ALTER TABLE deliveries ADD CONSTRAINT deliveries_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'retrying', 'failed_permanent', 'queued'));

-- Rebuild partial index to include 'queued'
DROP INDEX IF EXISTS idx_deliveries_status;
CREATE INDEX idx_deliveries_status
  ON deliveries(status, retry_count)
  WHERE status IN ('pending', 'sent', 'retrying', 'failed', 'queued');

-- ============================================================
-- 2. Create is_within_contact_hours(p_broker_id uuid) helper
-- ============================================================

CREATE OR REPLACE FUNCTION is_within_contact_hours(p_broker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_contact_hours text;
  v_custom_start text;
  v_custom_end text;
  v_weekend_pause boolean;
  v_timezone text;
  v_now timestamp;
  v_start_time time;
  v_end_time time;
BEGIN
  -- Fetch broker hours config
  SELECT contact_hours, custom_hours_start, custom_hours_end, weekend_pause, timezone
  INTO v_contact_hours, v_custom_start, v_custom_end, v_weekend_pause, v_timezone
  FROM brokers
  WHERE id = p_broker_id;

  -- If anytime or not set, always deliver
  IF v_contact_hours IS NULL OR v_contact_hours = 'anytime' THEN
    RETURN TRUE;
  END IF;

  -- Compute current time in broker's timezone (default America/Los_Angeles per TZ-01)
  v_now := now() AT TIME ZONE COALESCE(v_timezone, 'America/Los_Angeles');

  -- Weekend check: Saturday (6) or Sunday (0)
  IF v_weekend_pause = true AND EXTRACT(DOW FROM v_now) IN (0, 6) THEN
    RETURN FALSE;
  END IF;

  -- Determine hour window
  IF v_contact_hours = 'business_hours' THEN
    v_start_time := '09:00'::time;
    v_end_time := '17:00'::time;
  ELSIF v_contact_hours = 'custom' THEN
    -- Parse AM/PM format strings like '9:00 AM', '5:30 PM'
    v_start_time := to_timestamp(v_custom_start, 'HH:MI AM')::time;
    v_end_time := to_timestamp(v_custom_end, 'HH:MI AM')::time;
  ELSE
    -- Unknown contact_hours value, treat as anytime
    RETURN TRUE;
  END IF;

  -- Check if current time is within the window
  RETURN v_now::time BETWEEN v_start_time AND v_end_time;
END;
$$;

COMMENT ON FUNCTION is_within_contact_hours(uuid) IS
  'Returns true if the broker is currently within their contact hours window based on their timezone';

-- ============================================================
-- 3. Update assign_lead() to use hours-aware delivery status
-- ============================================================

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

-- ============================================================
-- 4. Update fire_outbound_webhook() to skip queued deliveries
-- ============================================================

CREATE OR REPLACE FUNCTION fire_outbound_webhook()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_request_id bigint;
BEGIN
  -- Only fire for webhook channel
  IF NEW.channel != 'crm_webhook' THEN
    RETURN NEW;
  END IF;

  -- Skip queued deliveries (will be released by Phase 11 cron job)
  IF NEW.status = 'queued' THEN
    RETURN NEW;
  END IF;

  IF NEW.target_url IS NULL OR NEW.target_url = '' THEN
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := NEW.target_url,
    body := NEW.payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO v_request_id;

  UPDATE deliveries
  SET pg_net_request_id = v_request_id,
      status = 'sent',
      sent_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Update fire_ghl_delivery() to skip queued deliveries
-- ============================================================

CREATE OR REPLACE FUNCTION fire_ghl_delivery()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_request_id bigint;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Only fire for GHL channels
  IF NEW.channel NOT IN ('email', 'sms') THEN
    RETURN NEW;
  END IF;

  -- Skip queued deliveries (will be released by Phase 11 cron job)
  IF NEW.status = 'queued' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase project URL from settings
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- If vault secrets not configured, skip (will be retried)
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Call edge function via pg_net
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/deliver-ghl',
    body := jsonb_build_object(
      'delivery_id', NEW.id,
      'channel', NEW.channel,
      'ghl_contact_id', NEW.ghl_contact_id,
      'payload', NEW.payload
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_request_id;

  RETURN NEW;
END;
$$;

-- NOTE: Existing AFTER INSERT triggers from migration 00011 remain valid.
-- Only function bodies were updated via CREATE OR REPLACE.
