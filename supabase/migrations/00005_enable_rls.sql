-- Enable RLS on all new tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE unassigned_queue ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing brokers table
-- Add a permissive SELECT policy for anon role so ppl-onboarding can still read
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to brokers" ON brokers
  FOR SELECT TO anon USING (true);

-- Service role key bypasses RLS entirely, so no policies needed for admin operations.
-- However, add anon SELECT policies on new tables for potential future client reads.

CREATE POLICY "Allow anon read access to orders" ON orders
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read access to leads" ON leads
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read access to activity_log" ON activity_log
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read access to unassigned_queue" ON unassigned_queue
  FOR SELECT TO anon USING (true);
