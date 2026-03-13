-- Migration: Queue processing
-- Releases queued deliveries when broker contact windows open.
-- Runs via pg_cron every 5 minutes, fires directly via net.http_post
-- (AFTER INSERT triggers are not re-triggered by UPDATE).

-- ============================================================
-- 1. process_queued_deliveries() function
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
BEGIN
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
    END IF;
  END LOOP;

  RETURN v_released;
END;
$$;

COMMENT ON FUNCTION process_queued_deliveries() IS
  'Releases queued deliveries when broker contact windows open. Runs via pg_cron every 5 minutes. Fires directly via net.http_post (webhooks) or edge function (GHL email/SMS). Returns count of released deliveries.';

-- ============================================================
-- 2. pg_cron schedule: every 5 minutes
-- ============================================================

SELECT cron.schedule(
  'process-queued-deliveries',
  '*/5 * * * *',
  'SELECT process_queued_deliveries()'
);
