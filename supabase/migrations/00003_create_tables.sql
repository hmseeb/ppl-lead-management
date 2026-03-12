-- Core schema tables for PPL Lead Management
-- CRITICAL: Do NOT modify the existing brokers table structure here.

-- Orders table
CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  total_leads integer NOT NULL CHECK (total_leads > 0),
  leads_delivered integer NOT NULL DEFAULT 0,
  leads_remaining integer NOT NULL,
  verticals text[] NOT NULL,
  credit_score_min integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  bonus_mode boolean NOT NULL DEFAULT false,
  last_assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_remaining_check CHECK (leads_remaining >= 0 OR bonus_mode = true)
);

-- Leads table
CREATE TABLE leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ghl_contact_id text UNIQUE,
  first_name text,
  last_name text,
  email text,
  phone text,
  business_name text,
  vertical text,
  credit_score integer,
  funding_amount numeric,
  funding_purpose text,
  state text,
  ai_call_notes text,
  ai_call_status text,
  raw_payload jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'unassigned')),
  assigned_broker_id uuid REFERENCES brokers(id),
  assigned_order_id uuid REFERENCES orders(id),
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Activity log
CREATE TABLE activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  lead_id uuid REFERENCES leads(id),
  broker_id uuid REFERENCES brokers(id),
  order_id uuid REFERENCES orders(id),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unassigned queue
CREATE TABLE unassigned_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) UNIQUE,
  reason text NOT NULL,
  details text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
