-- Migration: Fix four latent delivery bugs
-- Bug 1: is_within_contact_hours() uses 'HH:MI AM' format but data is stored in 24h ('08:00', '14:00')
-- Bug 2: fire_ghl_delivery() silently returns when vault secrets are missing, leaving delivery stuck in 'pending'
-- Bug 3: process_queued_deliveries() has no max-age timeout for queued deliveries
-- Bug 4: check_delivery_responses() has no timeout for pending deliveries with no pg_net_request_id

-- ============================================================
-- Bug 1: Fix is_within_contact_hours() time format
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
    -- FIX: Data is stored in 24h format like '08:00', '14:00'. Use HH24:MI instead of HH:MI AM.
    v_start_time := to_timestamp(v_custom_start, 'HH24:MI')::time;
    v_end_time := to_timestamp(v_custom_end, 'HH24:MI')::time;
  ELSE
    -- Unknown contact_hours value, treat as anytime
    RETURN TRUE;
  END IF;

  -- Check if current time is within the window
  RETURN v_now::time BETWEEN v_start_time AND v_end_time;
END;
$$;

-- ============================================================
-- Bug 2: Fix fire_ghl_delivery() silent vault secret skip
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

  -- Skip queued deliveries (will be released by cron job)
  IF NEW.status = 'queued' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase project URL from settings
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- FIX: If vault secrets not configured, mark as failed instead of silently skipping
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    UPDATE deliveries SET status = 'failed', error_message = 'vault_secrets_not_configured' WHERE id = NEW.id;
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

-- ============================================================
-- Bug 3: Fix process_queued_deliveries() with 48h timeout
-- ============================================================

CREATE OR REPLACE FUNCTION process_queued_deliveries()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_delivery record;
  v_request_id bigint;
  v_supabase_url text;
  v_service_key text;
  v_released int := 0;
  v_expired int := 0;
BEGIN
  -- FIX Bug 3: Expire queued deliveries older than 48 hours
  UPDATE deliveries
  SET status = 'failed',
      error_message = 'contact_window_expired'
  WHERE status = 'queued'
    AND created_at < now() - interval '48 hours';

  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Log expired deliveries to activity_log
  IF v_expired > 0 THEN
    INSERT INTO activity_log (event_type, lead_id, broker_id, order_id, details)
    SELECT
      'delivery_expired',
      d.lead_id,
      d.broker_id,
      d.order_id,
      jsonb_build_object(
        'delivery_id', d.id,
        'channel', d.channel,
        'error_message', 'contact_window_expired',
        'queued_duration_hours', EXTRACT(EPOCH FROM (now() - d.created_at)) / 3600
      )
    FROM deliveries d
    WHERE d.status = 'failed'
      AND d.error_message = 'contact_window_expired'
      AND d.updated_at >= now() - interval '1 minute';
  END IF;

  -- Fetch vault secrets upfront for GHL channel deliveries
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Process queued deliveries in FIFO order
  FOR v_delivery IN
    SELECT d.*
    FROM deliveries d
    WHERE d.status = 'queued'
    ORDER BY d.created_at ASC
  LOOP
    -- Check if broker is now within their contact window
    IF NOT is_within_contact_hours(v_delivery.broker_id) THEN
      CONTINUE;
    END IF;

    -- Fire based on channel
    IF v_delivery.channel = 'crm_webhook' THEN
      -- Skip if no target URL
      IF v_delivery.target_url IS NULL OR v_delivery.target_url = '' THEN
        CONTINUE;
      END IF;

      -- Fire webhook directly via pg_net
      SELECT net.http_post(
        url := v_delivery.target_url,
        body := v_delivery.payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
      ) INTO v_request_id;

      -- Mark as sent (same as fire_outbound_webhook)
      UPDATE deliveries
      SET status = 'sent',
          sent_at = now(),
          pg_net_request_id = v_request_id
      WHERE id = v_delivery.id;

      v_released := v_released + 1;

      -- Log delivery released
      INSERT INTO activity_log (event_type, lead_id, broker_id, order_id, details)
      VALUES (
        'delivery_released',
        v_delivery.lead_id,
        v_delivery.broker_id,
        v_delivery.order_id,
        jsonb_build_object(
          'channel', v_delivery.channel,
          'delivery_id', v_delivery.id,
          'queued_duration_minutes', EXTRACT(EPOCH FROM (now() - v_delivery.created_at)) / 60
        )
      );

    ELSIF v_delivery.channel IN ('email', 'sms') THEN
      -- Skip if vault secrets not configured
      IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
        CONTINUE;
      END IF;

      -- Fire via edge function (same as fire_ghl_delivery)
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/deliver-ghl',
        body := jsonb_build_object(
          'delivery_id', v_delivery.id,
          'channel', v_delivery.channel,
          'ghl_contact_id', v_delivery.ghl_contact_id,
          'payload', v_delivery.payload
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        )
      ) INTO v_request_id;

      -- Mark as pending (edge function handles final status)
      UPDATE deliveries
      SET status = 'pending',
          sent_at = now()
      WHERE id = v_delivery.id;

      v_released := v_released + 1;

      -- Log delivery released
      INSERT INTO activity_log (event_type, lead_id, broker_id, order_id, details)
      VALUES (
        'delivery_released',
        v_delivery.lead_id,
        v_delivery.broker_id,
        v_delivery.order_id,
        jsonb_build_object(
          'channel', v_delivery.channel,
          'delivery_id', v_delivery.id,
          'queued_duration_minutes', EXTRACT(EPOCH FROM (now() - v_delivery.created_at)) / 60
        )
      );
    END IF;
  END LOOP;

  RETURN v_released;
END;
$$;

-- ============================================================
-- Bug 4: Fix check_delivery_responses() with pending timeout
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
  -- FIX Bug 4: Fail pending deliveries older than 10 minutes with no pg_net_request_id
  -- These are deliveries where the trigger fired but the edge function never responded
  UPDATE deliveries
  SET status = 'failed',
      error_message = 'delivery_trigger_timeout'
  WHERE status = 'pending'
    AND pg_net_request_id IS NULL
    AND created_at < now() - interval '10 minutes';

  -- Normal response checking
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
