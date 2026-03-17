-- Phase 25: Order Creation + Payment
-- Add Stripe and pricing columns to orders table

ALTER TABLE orders ADD COLUMN stripe_checkout_session_id text UNIQUE;
ALTER TABLE orders ADD COLUMN stripe_payment_intent_id text;
ALTER TABLE orders ADD COLUMN price_per_lead_cents integer;
ALTER TABLE orders ADD COLUMN total_price_cents integer;

-- Update status constraint to allow 'pending_payment' for checkout flow
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('active', 'paused', 'completed', 'pending_payment'));
