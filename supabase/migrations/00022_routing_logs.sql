-- Phase 16: Routing Audit Trail
-- Per-lead routing logs with score breakdowns for every order considered

CREATE TABLE routing_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  broker_id uuid NOT NULL REFERENCES brokers(id),
  eligible boolean NOT NULL DEFAULT true,
  disqualify_reason text,
  score_breakdown jsonb NOT NULL DEFAULT '{}',
  total_score numeric(6,2) NOT NULL DEFAULT 0,
  fill_rate numeric(5,4) NOT NULL DEFAULT 0,
  selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_routing_logs_lead_id ON routing_logs(lead_id);
CREATE INDEX idx_routing_logs_order_id ON routing_logs(order_id);
CREATE INDEX idx_routing_logs_created_at ON routing_logs(created_at DESC);

ALTER TABLE routing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_routing_logs" ON routing_logs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_routing_logs" ON routing_logs FOR INSERT TO anon WITH CHECK (true);
