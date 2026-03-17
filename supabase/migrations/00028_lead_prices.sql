-- Phase 24: Pricing Engine
-- Per-lead pricing by vertical and credit tier, with optional per-broker overrides

CREATE TABLE lead_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vertical text NOT NULL,
  credit_tier_min integer NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  broker_id uuid REFERENCES brokers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_prices_unique UNIQUE NULLS NOT DISTINCT (vertical, credit_tier_min, broker_id)
);

-- Auto-update updated_at
CREATE TRIGGER lead_prices_updated_at
  BEFORE UPDATE ON lead_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: service role only
ALTER TABLE lead_prices ENABLE ROW LEVEL SECURITY;
