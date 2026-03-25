-- Migration: Callback scheduling infrastructure
-- Adds reminder tracking column to callbacks table and schedules a pg_cron job
-- to fire callback_reminder and callback_due webhooks via the fire-callback-webhooks
-- edge function.
--
-- Schedule: */5 * * * * = every 5 minutes
-- Reminders fire within a 20-minute window before scheduled_time to ensure the
-- 5-minute cron cycle catches callbacks ~15 minutes out.
--
-- Vault secrets required (already configured from Phase 6):
--   - supabase_url: project URL for pg_net HTTP calls
--   - service_role_key: auth token for edge function invocation

-- ============================================================
-- 1. Add reminder_sent_at column to callbacks table
-- Tracks whether a reminder webhook was already sent, preventing
-- duplicate reminders across cron runs.
-- ============================================================

ALTER TABLE callbacks ADD COLUMN reminder_sent_at timestamptz;

-- ============================================================
-- 2. pg_cron schedule: fire-callback-webhooks every 5 minutes
-- Uses pg_net to call fire-callback-webhooks edge function with
-- Vault-sourced auth. Pattern matches migration 00015 (daily-digest).
-- ============================================================

SELECT cron.schedule(
  'fire-callback-webhooks',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/fire-callback-webhooks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
