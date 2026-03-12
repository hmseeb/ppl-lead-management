-- Alter existing brokers table: ADD columns only, never DROP or ALTER existing ones.
-- Existing status column stores onboarding status ('completed', 'not_started') — leave it alone.
-- We add assignment_status for lead assignment lifecycle.

ALTER TABLE brokers ADD COLUMN IF NOT EXISTS assignment_status text NOT NULL DEFAULT 'active'
  CHECK (assignment_status IN ('active', 'paused', 'completed'));

ALTER TABLE brokers ADD COLUMN IF NOT EXISTS company text;
