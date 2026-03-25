-- Callbacks table for scheduling broker callbacks when unavailable
CREATE TABLE callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id),
  broker_id uuid NOT NULL REFERENCES brokers(id),
  scheduled_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying pending callbacks per broker
CREATE INDEX idx_callbacks_broker_status ON callbacks(broker_id, status);

-- Partial index for pg_cron job (Phase 36) to find upcoming pending callbacks
CREATE INDEX idx_callbacks_scheduled ON callbacks(scheduled_time) WHERE status = 'pending';

-- Reuse existing update_updated_at trigger
CREATE TRIGGER callbacks_updated_at
  BEFORE UPDATE ON callbacks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
