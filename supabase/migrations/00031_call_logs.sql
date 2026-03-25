-- Call logs table for recording AI call outcomes (transferred, callback_booked, no_answer, voicemail)
CREATE TABLE call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id),
  broker_id uuid NOT NULL REFERENCES brokers(id),
  outcome text NOT NULL CHECK (outcome IN ('transferred', 'callback_booked', 'no_answer', 'voicemail')),
  duration integer NOT NULL DEFAULT 0,
  retell_call_id text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for broker-scoped queries
CREATE INDEX idx_call_logs_broker_id ON call_logs(broker_id);

-- Index for date range filtering
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at);

-- Composite index for broker + date range queries (Phase 37 reporting dashboard)
CREATE INDEX idx_call_logs_broker_created ON call_logs(broker_id, created_at);
