-- Migration: Alert triggers for delivery failures and unassigned leads
-- Wires Phase 6 infrastructure (admin_settings, alert_state, send-alert edge function)
-- to real database events so the admin receives SMS alerts within seconds.
--
-- Both functions are SECURITY DEFINER because alert_state has no write RLS
-- policy for anon. Running as postgres bypasses RLS for INSERT/UPDATE.
--
-- The delivery trigger uses a WHEN clause on the trigger definition to avoid
-- firing on every deliveries UPDATE (status changes, retry_count increments, etc.).
-- Only fires when status transitions TO failed_permanent.
--
-- Dedup via alert_state prevents alert storms from batch failures.
-- Delivery failures dedup on broker_id (correlated endpoint failures).
-- Unassigned leads dedup on lead_id (each lead is independent).

-- ============================================================
-- 1. Delivery failure trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION notify_delivery_failed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings record;
  v_already_alerted boolean;
  v_dedup_window interval;
  v_lead_name text;
  v_broker_name text;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Step 1: Read admin settings (singleton table, fast lookup)
  SELECT * INTO v_settings FROM admin_settings LIMIT 1;
  IF NOT FOUND OR NOT v_settings.alert_sms_enabled OR NOT v_settings.failure_alert_enabled THEN
    RETURN NEW;
  END IF;

  -- Step 2: Check dedup (keyed on broker_id for correlated failure grouping)
  v_dedup_window := (v_settings.dedup_window_minutes || ' minutes')::interval;
  SELECT EXISTS (
    SELECT 1 FROM alert_state
    WHERE alert_type = 'delivery_failed'
      AND context_id = NEW.broker_id::text
      AND last_sent_at > now() - v_dedup_window
  ) INTO v_already_alerted;

  IF v_already_alerted THEN
    UPDATE alert_state
    SET suppressed_count = suppressed_count + 1,
        last_payload = jsonb_build_object(
          'delivery_id', NEW.id, 'channel', NEW.channel,
          'error', NEW.error_message
        )
    WHERE alert_type = 'delivery_failed' AND context_id = NEW.broker_id::text;
    RETURN NEW;
  END IF;

  -- Step 3: Resolve human-readable names via JOINs (NULL-safe)
  SELECT TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, ''))
  INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;
  v_lead_name := NULLIF(v_lead_name, '');
  IF v_lead_name IS NULL THEN
    SELECT COALESCE(l.email, l.phone, l.id::text)
    INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;
  END IF;

  SELECT TRIM(COALESCE(b.first_name, '') || ' ' || COALESCE(b.last_name, ''))
  INTO v_broker_name FROM brokers b WHERE b.id = NEW.broker_id;
  v_broker_name := NULLIF(v_broker_name, '');
  IF v_broker_name IS NULL THEN
    SELECT COALESCE(b.company, b.email, b.id::text)
    INTO v_broker_name FROM brokers b WHERE b.id = NEW.broker_id;
  END IF;

  -- Step 4: Read Vault secrets (early return if missing)
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Step 5: Fire pg_net to send-alert edge function
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-alert',
    body := jsonb_build_object(
      'type', 'delivery_failed',
      'admin_contact_id', v_settings.alert_ghl_contact_id,
      'lead_name', v_lead_name,
      'broker_name', v_broker_name,
      'channel', NEW.channel,
      'error', COALESCE(NEW.error_message, 'Unknown error')
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  -- Step 6: Record alert in dedup table (UPSERT)
  INSERT INTO alert_state (alert_type, context_id, last_sent_at, suppressed_count, last_payload)
  VALUES ('delivery_failed', NEW.broker_id::text, now(), 0,
    jsonb_build_object('delivery_id', NEW.id, 'channel', NEW.channel, 'error', NEW.error_message))
  ON CONFLICT (alert_type, context_id)
  DO UPDATE SET last_sent_at = now(), suppressed_count = 0, last_payload = EXCLUDED.last_payload;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Delivery failure trigger definition
-- WHEN clause prevents firing on every UPDATE. Only fires when
-- status transitions TO failed_permanent. IS DISTINCT FROM
-- handles NULL safely.
-- ============================================================

CREATE TRIGGER trg_alert_delivery_failed
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'failed_permanent' AND NEW.status = 'failed_permanent')
  EXECUTE FUNCTION notify_delivery_failed();

-- ============================================================
-- 3. Unassigned lead trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION notify_unassigned_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings record;
  v_already_alerted boolean;
  v_dedup_window interval;
  v_lead_name text;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Step 1: Read admin settings
  SELECT * INTO v_settings FROM admin_settings LIMIT 1;
  IF NOT FOUND OR NOT v_settings.alert_sms_enabled OR NOT v_settings.unassigned_alert_enabled THEN
    RETURN NEW;
  END IF;

  -- Step 2: Check dedup (keyed on lead_id for unassigned leads)
  v_dedup_window := (v_settings.dedup_window_minutes || ' minutes')::interval;
  SELECT EXISTS (
    SELECT 1 FROM alert_state
    WHERE alert_type = 'unassigned_lead'
      AND context_id = NEW.lead_id::text
      AND last_sent_at > now() - v_dedup_window
  ) INTO v_already_alerted;

  IF v_already_alerted THEN
    UPDATE alert_state
    SET suppressed_count = suppressed_count + 1,
        last_payload = jsonb_build_object('reason', NEW.reason, 'details', NEW.details)
    WHERE alert_type = 'unassigned_lead' AND context_id = NEW.lead_id::text;
    RETURN NEW;
  END IF;

  -- Step 3: Resolve lead name (NULL-safe, no broker needed)
  SELECT TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, ''))
  INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;
  v_lead_name := NULLIF(v_lead_name, '');
  IF v_lead_name IS NULL THEN
    SELECT COALESCE(l.email, l.phone, l.id::text)
    INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;
  END IF;

  -- Step 4: Read Vault secrets (early return if missing)
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Step 5: Fire pg_net to send-alert edge function
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-alert',
    body := jsonb_build_object(
      'type', 'unassigned_lead',
      'admin_contact_id', v_settings.alert_ghl_contact_id,
      'lead_name', v_lead_name,
      'reason', NEW.reason || COALESCE(': ' || NEW.details, '')
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  -- Step 6: Record alert in dedup table (UPSERT)
  INSERT INTO alert_state (alert_type, context_id, last_sent_at, suppressed_count, last_payload)
  VALUES ('unassigned_lead', NEW.lead_id::text, now(), 0,
    jsonb_build_object('reason', NEW.reason, 'details', NEW.details))
  ON CONFLICT (alert_type, context_id)
  DO UPDATE SET last_sent_at = now(), suppressed_count = 0, last_payload = EXCLUDED.last_payload;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Unassigned lead trigger definition
-- No WHEN clause needed: every INSERT into unassigned_queue is
-- a meaningful event worth alerting on. Dedup inside the
-- function handles repeat entries for the same lead.
-- ============================================================

CREATE TRIGGER trg_alert_unassigned_lead
  AFTER INSERT ON unassigned_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_unassigned_lead();
