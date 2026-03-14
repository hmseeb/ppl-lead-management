-- Migration 00025: Fix stuck pending leads
--
-- Root cause: Two overloads of assign_lead() existed simultaneously:
--   1) assign_lead(p_lead_id uuid)            -- old, from 00006/00009
--   2) assign_lead(p_lead_id uuid, p_order_id uuid DEFAULT NULL) -- new, from 00021
--
-- When the scoring engine found no eligible orders and called the RPC with
-- only p_lead_id, PostgREST/Postgres could not resolve the ambiguity
-- ("function assign_lead(uuid) is not unique"), causing an error that the
-- incoming route silently caught. Leads stayed in 'pending' forever.
--
-- Fix:
--   A) Drop the old single-parameter overload.
--   B) Move all 'pending' leads to 'unassigned' + insert into unassigned_queue.

-- =============================================================
-- Part A: Drop the old overload so only the 2-param version remains
-- =============================================================

DROP FUNCTION IF EXISTS assign_lead(uuid);

-- =============================================================
-- Part B: Fix the 141 stuck pending leads
-- =============================================================

-- Insert into unassigned_queue for each stuck lead (before status update
-- so we can use the pending status as our filter).
INSERT INTO unassigned_queue (lead_id, reason, details)
SELECT
  id,
  'no_matching_order',
  format(
    'Retroactive fix: lead was stuck in pending due to assign_lead overload ambiguity. Vertical: %s',
    COALESCE(vertical, 'NULL')
  )
FROM leads
WHERE status = 'pending';

-- Log the fix in activity_log
INSERT INTO activity_log (event_type, lead_id, details)
SELECT
  'lead_unassigned',
  id,
  jsonb_build_object(
    'reason', 'retroactive_fix_overload_ambiguity',
    'vertical', vertical,
    'credit_score', credit_score,
    'original_status', 'pending'
  )
FROM leads
WHERE status = 'pending';

-- Now flip them to unassigned
UPDATE leads
SET status = 'unassigned', updated_at = now()
WHERE status = 'pending';
