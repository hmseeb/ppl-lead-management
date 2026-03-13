-- Migration: Unify delivery tracking across all channels (webhook, email, SMS)
-- Adds channel column, makes target_url nullable, adds ghl_message_id.
-- Updates assign_lead to insert delivery rows for all broker delivery_methods.
-- Updates retry pipeline to handle GHL channels via edge function.

-- ============================================================
-- 1. Evolve webhook_deliveries -> deliveries
-- ============================================================

-- Add new columns
ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'crm_webhook'
    CHECK (channel IN ('crm_webhook', 'email', 'sms')),
  ADD COLUMN IF NOT EXISTS ghl_message_id text,
  ADD COLUMN IF NOT EXISTS ghl_contact_id text;

-- Make target_url nullable (email/SMS don't have one)
ALTER TABLE webhook_deliveries ALTER COLUMN target_url DROP NOT NULL;

-- Rename table
ALTER TABLE webhook_deliveries RENAME TO deliveries;

-- Rename indexes
ALTER INDEX idx_webhook_deliveries_status RENAME TO idx_deliveries_status;
ALTER INDEX idx_webhook_deliveries_lead RENAME TO idx_deliveries_lead;

-- Add channel index for filtering
CREATE INDEX idx_deliveries_channel ON deliveries(channel);

-- Rename trigger
ALTER TRIGGER webhook_deliveries_updated_at ON deliveries RENAME TO deliveries_updated_at;

-- Rename RLS policy
ALTER POLICY "Allow anon read access to webhook_deliveries" ON deliveries
  RENAME TO "Allow anon read access to deliveries";

-- Rename FK constraints for clarity
ALTER TABLE deliveries RENAME CONSTRAINT webhook_deliveries_lead_id_fkey TO deliveries_lead_id_fkey;
ALTER TABLE deliveries RENAME CONSTRAINT webhook_deliveries_broker_id_fkey TO deliveries_broker_id_fkey;
ALTER TABLE deliveries RENAME CONSTRAINT webhook_deliveries_order_id_fkey TO deliveries_order_id_fkey;
ALTER TABLE deliveries RENAME CONSTRAINT webhook_deliveries_pkey TO deliveries_pkey;

-- ============================================================
-- 2. Update assign_lead to insert delivery rows for ALL channels
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

  -- Insert delivery row for each channel
  IF 'crm_webhook' = ANY(v_methods) AND v_webhook_url IS NOT NULL AND v_webhook_url != '' THEN
    INSERT INTO deliveries (lead_id, broker_id, order_id, channel, target_url, payload)
    VALUES (p_lead_id, v_order.broker_id, v_order.id, 'crm_webhook', v_webhook_url, v_payload)
    RETURNING id INTO v_delivery_id;
    v_delivery_ids := v_delivery_ids || to_jsonb(v_delivery_id);
  END IF;

  IF 'email' = ANY(v_methods) AND v_ghl_contact_id IS NOT NULL THEN
    INSERT INTO deliveries (lead_id, broker_id, order_id, channel, ghl_contact_id, payload)
    VALUES (p_lead_id, v_order.broker_id, v_order.id, 'email', v_ghl_contact_id, v_payload)
    RETURNING id INTO v_delivery_id;
    v_delivery_ids := v_delivery_ids || to_jsonb(v_delivery_id);
  END IF;

  IF 'sms' = ANY(v_methods) AND v_ghl_contact_id IS NOT NULL THEN
    INSERT INTO deliveries (lead_id, broker_id, order_id, channel, ghl_contact_id, payload)
    VALUES (p_lead_id, v_order.broker_id, v_order.id, 'sms', v_ghl_contact_id, v_payload)
    RETURNING id INTO v_delivery_id;
    v_delivery_ids := v_delivery_ids || to_jsonb(v_delivery_id);
  END IF;

  RETURN jsonb_build_object(
    'status', 'assigned',
    'broker_id', v_order.broker_id,
    'order_id', v_order.id,
    'delivery_ids', v_delivery_ids
  );
END;
$$;

-- ============================================================
-- 3. Update webhook trigger to only fire for crm_webhook channel
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

-- Recreate trigger on renamed table
DROP TRIGGER IF EXISTS trg_fire_outbound_webhook ON deliveries;
CREATE TRIGGER trg_fire_outbound_webhook
  AFTER INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION fire_outbound_webhook();

-- ============================================================
-- 4. Add trigger to fire edge function for email/SMS channels
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

CREATE TRIGGER trg_fire_ghl_delivery
  AFTER INSERT ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION fire_ghl_delivery();

-- ============================================================
-- 5. Update check_delivery_responses to use new table name
-- ============================================================

CREATE OR REPLACE FUNCTION check_delivery_responses()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_delivery record;
  v_response record;
  v_processed_ids bigint[] := '{}';
BEGIN
  FOR v_delivery IN
    SELECT wd.id, wd.pg_net_request_id
    FROM deliveries wd
    WHERE wd.status IN ('sent', 'retrying')
      AND wd.pg_net_request_id IS NOT NULL
      AND wd.channel = 'crm_webhook'
      AND wd.sent_at > now() - interval '10 minutes'
  LOOP
    SELECT r.status_code, r.timed_out, r.error_msg
    INTO v_response
    FROM net._http_response r
    WHERE r.id = v_delivery.pg_net_request_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_processed_ids := array_append(v_processed_ids, v_delivery.pg_net_request_id);

    IF v_response.timed_out = true THEN
      UPDATE deliveries
      SET status = 'failed',
          error_message = 'Request timed out'
      WHERE id = v_delivery.id;
      CONTINUE;
    END IF;

    IF v_response.status_code IS NULL OR v_response.status_code >= 400 THEN
      UPDATE deliveries
      SET status = 'failed',
          error_message = COALESCE(v_response.error_msg, 'HTTP ' || v_response.status_code::text)
      WHERE id = v_delivery.id;
      CONTINUE;
    END IF;
  END LOOP;

  IF array_length(v_processed_ids, 1) > 0 THEN
    DELETE FROM net._http_response WHERE id = ANY(v_processed_ids);
  END IF;
END;
$$;

-- ============================================================
-- 6. Update process_webhook_retries to handle all channels
-- ============================================================

CREATE OR REPLACE FUNCTION process_webhook_retries(p_batch_size integer DEFAULT 10)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_delivery record;
  v_new_request_id bigint;
  v_perm_failed record;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Get vault secrets for GHL retries
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  FOR v_delivery IN
    SELECT *
    FROM deliveries
    WHERE status = 'failed'
      AND retry_count < 3
      AND (
        last_retry_at IS NULL
        OR last_retry_at <= now() - (interval '1 minute' * power(2, retry_count))
      )
    ORDER BY created_at ASC
    LIMIT p_batch_size
  LOOP
    IF v_delivery.channel = 'crm_webhook' THEN
      -- Retry webhook via pg_net directly
      SELECT net.http_post(
        url := v_delivery.target_url,
        body := v_delivery.payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
      ) INTO v_new_request_id;

      UPDATE deliveries
      SET pg_net_request_id = v_new_request_id,
          retry_count = retry_count + 1,
          status = 'retrying',
          last_retry_at = now(),
          error_message = NULL
      WHERE id = v_delivery.id;

    ELSIF v_delivery.channel IN ('email', 'sms') AND v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      -- Retry GHL delivery via edge function
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/deliver-ghl',
        body := jsonb_build_object(
          'delivery_id', v_delivery.id,
          'channel', v_delivery.channel,
          'ghl_contact_id', v_delivery.ghl_contact_id,
          'payload', v_delivery.payload,
          'is_retry', true
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        )
      ) INTO v_new_request_id;

      UPDATE deliveries
      SET retry_count = retry_count + 1,
          status = 'retrying',
          last_retry_at = now(),
          error_message = NULL
      WHERE id = v_delivery.id;
    END IF;
  END LOOP;

  -- Mark permanently failed
  FOR v_perm_failed IN
    UPDATE deliveries
    SET status = 'failed_permanent'
    WHERE status = 'failed'
      AND retry_count >= 3
    RETURNING id, lead_id, broker_id, order_id, channel, error_message, retry_count
  LOOP
    INSERT INTO activity_log (event_type, lead_id, broker_id, order_id, details)
    VALUES (
      'delivery_failed_permanent',
      v_perm_failed.lead_id,
      v_perm_failed.broker_id,
      v_perm_failed.order_id,
      jsonb_build_object(
        'delivery_id', v_perm_failed.id,
        'channel', v_perm_failed.channel,
        'error_message', v_perm_failed.error_message,
        'retry_count', v_perm_failed.retry_count
      )
    );
  END LOOP;
END;
$$;
