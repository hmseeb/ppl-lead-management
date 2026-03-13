-- Phase 14: Pre-flight Validation
-- Add 'rejected' status, rejection_reason column, and email+phone dedup index

-- 1. Expand leads status CHECK to include 'rejected'
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('pending', 'assigned', 'unassigned', 'rejected'));

-- 2. Add rejection_reason column
ALTER TABLE leads ADD COLUMN rejection_reason text;

-- 3. Email+phone dedup partial unique index (case-insensitive email)
CREATE UNIQUE INDEX idx_leads_email_phone_dedup
  ON leads (LOWER(email), phone)
  WHERE email IS NOT NULL AND email != ''
    AND phone IS NOT NULL AND phone != '';

-- 4. Partial index for rejected leads dashboard queries
CREATE INDEX idx_leads_rejected ON leads(created_at DESC) WHERE status = 'rejected';
