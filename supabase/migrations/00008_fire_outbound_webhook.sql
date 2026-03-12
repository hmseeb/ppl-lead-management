-- Migration: fire_outbound_webhook trigger
-- Fires an async HTTP POST via pg_net when a webhook_deliveries row is inserted.
-- The trigger updates the same row with the pg_net request_id and marks status = 'sent'.

CREATE OR REPLACE FUNCTION fire_outbound_webhook()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_request_id bigint;
BEGIN
  -- Skip if no target URL configured
  IF NEW.target_url IS NULL OR NEW.target_url = '' THEN
    RETURN NEW;
  END IF;

  -- Fire async HTTP POST to broker's CRM webhook
  SELECT net.http_post(
    url := NEW.target_url,
    body := NEW.payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO v_request_id;

  -- Record the pg_net request ID and mark as sent
  UPDATE webhook_deliveries
  SET pg_net_request_id = v_request_id,
      status = 'sent',
      sent_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fire_outbound_webhook
  AFTER INSERT ON webhook_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION fire_outbound_webhook();
