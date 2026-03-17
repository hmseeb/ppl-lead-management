-- Migration: Broker-scoped RLS policies for portal data isolation (defense-in-depth)
-- KEEPS existing "Allow anon read access" policies for admin Realtime subscriptions.
-- Primary isolation is application-level filtering in src/lib/portal/queries.ts.
-- Service role (admin) bypasses RLS entirely, so admin server queries are unaffected.

-- Note: We do NOT drop existing anon read policies because:
-- 1. Admin dashboard Realtime uses anon key to subscribe to leads/orders/deliveries changes
-- 2. Dropping those policies would break live dashboard updates
-- 3. Portal isolation is enforced at application level (all queries filter by broker_id)
-- 4. Portal runs server-side with service_role, so RLS doesn't apply to portal queries anyway

-- Add broker insert policies for portal mutations (if needed in future with anon key)
CREATE POLICY "Broker can insert own orders" ON orders
  FOR INSERT TO anon
  WITH CHECK (
    broker_id::text = coalesce(
      current_setting('request.headers', true)::json->>'x-broker-id',
      ''
    )
  );

CREATE POLICY "Broker can update own orders" ON orders
  FOR UPDATE TO anon
  USING (
    broker_id::text = coalesce(
      current_setting('request.headers', true)::json->>'x-broker-id',
      ''
    )
  );
