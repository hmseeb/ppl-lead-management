-- Migration: Broker-scoped RLS policies for portal data isolation
-- Replaces permissive "allow all anon reads" with broker-scoped policies.
-- Service role (admin) bypasses RLS entirely, so admin queries are unaffected.
-- Defense-in-depth: primary isolation is application-level filtering in src/lib/portal/queries.ts

-- ============================================================
-- 1. Replace leads policy: anon can only read leads assigned to them
-- ============================================================
DROP POLICY IF EXISTS "Allow anon read access to leads" ON leads;

CREATE POLICY "Broker can read own leads" ON leads
  FOR SELECT TO anon
  USING (
    assigned_broker_id::text = coalesce(
      current_setting('request.headers', true)::json->>'x-broker-id',
      ''
    )
  );

-- ============================================================
-- 2. Replace orders policy: anon can only read their own orders
-- ============================================================
DROP POLICY IF EXISTS "Allow anon read access to orders" ON orders;

CREATE POLICY "Broker can read own orders" ON orders
  FOR SELECT TO anon
  USING (
    broker_id::text = coalesce(
      current_setting('request.headers', true)::json->>'x-broker-id',
      ''
    )
  );

-- ============================================================
-- 3. Replace deliveries policy: anon can only read their own deliveries
-- ============================================================
DROP POLICY IF EXISTS "Allow anon read access to deliveries" ON deliveries;

CREATE POLICY "Broker can read own deliveries" ON deliveries
  FOR SELECT TO anon
  USING (
    broker_id::text = coalesce(
      current_setting('request.headers', true)::json->>'x-broker-id',
      ''
    )
  );

-- ============================================================
-- Notes:
-- - brokers table keeps "Allow anon read access to brokers" (ppl-onboarding needs it)
-- - activity_log keeps existing policy (admin-only, not exposed to portal)
-- - unassigned_queue keeps existing policy (admin-only, not exposed to portal)
-- - current_setting('request.headers', true) returns NULL if not set (safe, no error)
-- - coalesce to '' ensures no accidental match when header is missing
-- ============================================================
