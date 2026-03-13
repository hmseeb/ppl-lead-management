-- Migration: Alert deduplication table and cleanup infrastructure
-- Prevents alert storms when batch failures occur (10+ deliveries failing
-- simultaneously). Without dedup, identical SMS messages would spam the admin
-- and exhaust the shared GHL rate limit.
--
-- This table MUST exist before Phase 7 wires any triggers.

-- ============================================================
-- 1. alert_state table
-- ============================================================
CREATE TABLE alert_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL,       -- 'delivery_failed' or 'unassigned_lead' (extensible)
  context_id text NOT NULL,       -- broker_id (failures) or lead_id (unassigned). Text for any ID format.
  last_sent_at timestamptz NOT NULL DEFAULT now(),  -- When the last alert was actually sent
  suppressed_count integer NOT NULL DEFAULT 0,      -- Alerts suppressed since last send (observability)
  last_payload jsonb,             -- Most recent suppressed payload (debugging)
  UNIQUE (alert_type, context_id)
);

-- ============================================================
-- 2. Lookup index for dedup check query
-- Phase 7 triggers will query: WHERE alert_type = $1 AND context_id = $2 AND last_sent_at > now() - interval '15 minutes'
-- ============================================================
CREATE INDEX idx_alert_state_lookup ON alert_state(alert_type, context_id, last_sent_at);

-- ============================================================
-- 3. Row Level Security
-- No write policy for anon. Trigger functions in Phase 7 run as SECURITY DEFINER.
-- ============================================================
ALTER TABLE alert_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to alert_state" ON alert_state
  FOR SELECT TO anon USING (true);

-- ============================================================
-- 4. Weekly cleanup cron (Sunday midnight UTC)
-- Rows older than 7 days are stale (15-minute dedup window long passed).
-- Prevents unbounded table growth.
-- ============================================================
SELECT cron.schedule(
  'cleanup-alert-state',
  '0 0 * * 0',
  $$DELETE FROM alert_state WHERE last_sent_at < now() - interval '7 days'$$
);

-- ============================================================
-- 5. Usage pattern for Phase 7 triggers
-- ============================================================
-- Phase 7 triggers will use this table as follows:
-- 1. Check: SELECT EXISTS (SELECT 1 FROM alert_state WHERE alert_type = $1 AND context_id = $2 AND last_sent_at > now() - interval '15 minutes')
-- 2. If exists: UPDATE alert_state SET suppressed_count = suppressed_count + 1 WHERE ...
-- 3. If not: INSERT ... ON CONFLICT (alert_type, context_id) DO UPDATE SET last_sent_at = now(), suppressed_count = 0
