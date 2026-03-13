-- Migration: Admin settings table and Vault secret for alert configuration
-- Creates a singleton admin_settings table to store alert preferences.
-- Seeds with admin GHL contact ID and stores it in Supabase Vault.
-- Enables RLS with anon read-only access.

-- ============================================================
-- 1. Create admin_settings table
-- ============================================================

CREATE TABLE admin_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_ghl_contact_id text NOT NULL,
  alert_sms_enabled boolean NOT NULL DEFAULT true,
  failure_alert_enabled boolean NOT NULL DEFAULT true,
  unassigned_alert_enabled boolean NOT NULL DEFAULT true,
  dedup_window_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Singleton constraint: enforce exactly one row
CREATE UNIQUE INDEX admin_settings_singleton ON admin_settings ((true));

-- ============================================================
-- 2. updated_at trigger (reuses function from migration 00003)
-- ============================================================

CREATE TRIGGER admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. Seed initial admin settings
-- ============================================================

INSERT INTO admin_settings (alert_ghl_contact_id)
VALUES ('llsWInEk2r7jRoxhPl5T');

-- ============================================================
-- 4. Store admin contact ID in Vault
-- ============================================================

SELECT vault.create_secret('llsWInEk2r7jRoxhPl5T', 'admin_ghl_contact_id');

-- ============================================================
-- 5. RLS: anon read-only access
-- ============================================================

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to admin_settings" ON admin_settings
  FOR SELECT TO anon USING (true);
