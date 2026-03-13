-- Phase 13: Order Model Expansion
-- Add loan range, priority, and order type columns to orders

ALTER TABLE orders ADD COLUMN loan_min integer;
ALTER TABLE orders ADD COLUMN loan_max integer;
ALTER TABLE orders ADD COLUMN priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal'));
ALTER TABLE orders ADD COLUMN order_type text NOT NULL DEFAULT 'one_time' CHECK (order_type IN ('one_time', 'monthly'));

ALTER TABLE orders ADD CONSTRAINT loan_range_check CHECK (loan_min IS NULL OR loan_max IS NULL OR loan_min <= loan_max);
