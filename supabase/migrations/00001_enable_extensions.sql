-- Enable extensions needed for Phase 1+
-- Note: pg_cron and pg_net require the postgres role.
-- If this migration fails, run these statements manually in the Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
