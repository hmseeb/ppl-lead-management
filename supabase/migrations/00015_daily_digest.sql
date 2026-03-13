-- Migration: Daily digest infrastructure
-- Creates digest_runs tracking table, performance index on deliveries.created_at,
-- and pg_cron schedule to fire send-digest edge function at 8 AM Pacific daily.
--
-- Schedule: 0 16 * * * UTC = 8 AM PST (9 AM during PDT, Mar-Nov).
-- pg_cron on Supabase runs UTC-only. Accept 1-hour DST drift for a morning summary.
--
-- Vault secrets required (already configured from Phase 6):
--   - supabase_url: project URL for pg_net HTTP calls
--   - service_role_key: auth token for edge function invocation

-- ============================================================
-- 1. digest_runs tracking table
-- Records each digest execution with period boundaries and stats snapshot.
-- Used by send-digest edge function to determine time window for stats queries,
-- preventing double-counting and handling skipped digests gracefully.
-- ============================================================

CREATE TABLE digest_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  stats jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE digest_runs IS 'Tracks daily digest executions with period boundaries and stats snapshots for audit trail and gap detection';

-- ============================================================
-- 2. RLS: anon read-only (matches admin_settings pattern)
-- ============================================================

ALTER TABLE digest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to digest_runs" ON digest_runs
  FOR SELECT TO anon USING (true);

-- ============================================================
-- 3. Performance index on deliveries.created_at
-- Prevents sequential scans on time-bounded queries used by both
-- the digest stats and the dashboard's fetchDeliveryStats().
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at);

-- ============================================================
-- 4. pg_cron schedule: daily digest at 16:00 UTC (8 AM PST)
-- Uses pg_net to call send-digest edge function with Vault-sourced auth.
-- Pattern matches migration 00014 (notify_delivery_failed).
-- ============================================================

SELECT cron.schedule(
  'daily-digest',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/send-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
