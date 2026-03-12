-- Migration: webhook_deliveries table
-- Tracks every outbound webhook delivery attempt per lead assignment.
-- Status lifecycle: pending -> sent -> (failed -> retrying -> sent | failed_permanent)

CREATE TABLE webhook_deliveries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id),
  broker_id uuid NOT NULL REFERENCES brokers(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  target_url text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'retrying', 'failed_permanent')),
  pg_net_request_id bigint,
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  sent_at timestamptz,
  last_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE webhook_deliveries IS
  'Tracks outbound webhook deliveries. Status lifecycle: pending -> sent -> (failed -> retrying -> sent | failed_permanent)';

-- Auto-update updated_at (reuse existing trigger function from 00003)
CREATE TRIGGER webhook_deliveries_updated_at
  BEFORE UPDATE ON webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for delivery processing and monitoring
CREATE INDEX idx_webhook_deliveries_status
  ON webhook_deliveries(status, retry_count)
  WHERE status IN ('pending', 'sent', 'retrying', 'failed');

CREATE INDEX idx_webhook_deliveries_lead
  ON webhook_deliveries(lead_id);

-- RLS: match existing pattern from 00005_enable_rls.sql
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to webhook_deliveries" ON webhook_deliveries
  FOR SELECT TO anon USING (true);
