-- Migration: Response checker + retry scanner + pg_cron schedules
-- Two functions that form the delivery retry pipeline:
--   1. check_delivery_responses() - reads pg_net HTTP responses, marks failed deliveries
--   2. process_webhook_retries() - retries failed deliveries with exponential backoff + batch limit
-- Both are scheduled via pg_cron.

-- ============================================================
-- Function 1: check_delivery_responses()
-- Runs every 30s. Reads pg_net _http_response table to determine
-- if recently sent deliveries succeeded or failed.
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
  -- Find deliveries that have a pg_net request ID and are awaiting response
  FOR v_delivery IN
    SELECT wd.id, wd.pg_net_request_id
    FROM webhook_deliveries wd
    WHERE wd.status IN ('sent', 'retrying')
      AND wd.pg_net_request_id IS NOT NULL
      AND wd.sent_at > now() - interval '10 minutes'
  LOOP
    -- Look up the pg_net response for this request
    SELECT r.status_code, r.timed_out, r.error_msg
    INTO v_response
    FROM net._http_response r
    WHERE r.id = v_delivery.pg_net_request_id;

    -- No response row yet: pg_net hasn't finished. Skip.
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Track this response ID for cleanup
    v_processed_ids := array_append(v_processed_ids, v_delivery.pg_net_request_id);

    -- Check for timeout
    IF v_response.timed_out = true THEN
      UPDATE webhook_deliveries
      SET status = 'failed',
          error_message = 'Request timed out'
      WHERE id = v_delivery.id;
      CONTINUE;
    END IF;

    -- Check for HTTP error (4xx/5xx) or null status (connection failure)
    IF v_response.status_code IS NULL OR v_response.status_code >= 400 THEN
      UPDATE webhook_deliveries
      SET status = 'failed',
          error_message = COALESCE(v_response.error_msg, 'HTTP ' || v_response.status_code::text)
      WHERE id = v_delivery.id;
      CONTINUE;
    END IF;

    -- 2xx success: no action needed, status stays 'sent' (already correct)
  END LOOP;

  -- Clean up processed pg_net response rows to prevent table bloat
  IF array_length(v_processed_ids, 1) > 0 THEN
    DELETE FROM net._http_response WHERE id = ANY(v_processed_ids);
  END IF;
END;
$$;

-- ============================================================
-- Function 2: process_webhook_retries(p_batch_size)
-- Runs every 2 min. Retries failed deliveries with:
--   - Exponential backoff: 1min, 2min, 4min
--   - Batch limit: max 10 per execution (prevents retry storms)
--   - Marks failed_permanent after 3 retries with activity_log entry
-- ============================================================
CREATE OR REPLACE FUNCTION process_webhook_retries(p_batch_size integer DEFAULT 10)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_delivery record;
  v_new_request_id bigint;
  v_perm_failed record;
BEGIN
  -- Process failed deliveries that haven't exhausted retries
  FOR v_delivery IN
    SELECT *
    FROM webhook_deliveries
    WHERE status = 'failed'
      AND retry_count < 3
      -- Exponential backoff check: skip if too soon since last retry
      AND (
        last_retry_at IS NULL
        OR last_retry_at <= now() - (interval '1 minute' * power(2, retry_count))
      )
    ORDER BY created_at ASC
    LIMIT p_batch_size
  LOOP
    -- Re-fire the webhook using the stored payload snapshot
    SELECT net.http_post(
      url := v_delivery.target_url,
      body := v_delivery.payload,
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) INTO v_new_request_id;

    -- Update delivery record
    UPDATE webhook_deliveries
    SET pg_net_request_id = v_new_request_id,
        retry_count = retry_count + 1,
        status = 'retrying',
        last_retry_at = now(),
        error_message = NULL
    WHERE id = v_delivery.id;
  END LOOP;

  -- Mark permanently failed: deliveries that have exhausted all 3 retries
  -- and log each to activity_log for admin visibility
  FOR v_perm_failed IN
    UPDATE webhook_deliveries
    SET status = 'failed_permanent'
    WHERE status = 'failed'
      AND retry_count >= 3
    RETURNING id, lead_id, broker_id, order_id, error_message, retry_count
  LOOP
    INSERT INTO activity_log (event_type, lead_id, broker_id, order_id, details)
    VALUES (
      'webhook_failed_permanent',
      v_perm_failed.lead_id,
      v_perm_failed.broker_id,
      v_perm_failed.order_id,
      jsonb_build_object(
        'delivery_id', v_perm_failed.id,
        'error_message', v_perm_failed.error_message,
        'retry_count', v_perm_failed.retry_count
      )
    );
  END LOOP;
END;
$$;

-- ============================================================
-- pg_cron schedules
-- ============================================================

-- Check delivery responses every 30 seconds
-- pg_cron on Supabase supports sub-minute '30 seconds' syntax
SELECT cron.schedule(
  'check-delivery-responses',
  '30 seconds',
  'SELECT check_delivery_responses()'
);

-- Retry failed webhooks every 2 minutes with batch size 10
SELECT cron.schedule(
  'retry-failed-webhooks',
  '*/2 * * * *',
  'SELECT process_webhook_retries(10)'
);
