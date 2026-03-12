---
phase: 03-lead-delivery
plan: 01
subsystem: database
tags: [pg_net, webhook, postgres, trigger, delivery]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "brokers, leads, orders tables; assign_lead() function; RLS policies"
provides:
  - "webhook_deliveries table with full status tracking"
  - "fire_outbound_webhook() pg_net trigger for async HTTP POST"
  - "Updated assign_lead() that creates delivery records on assignment"
  - "TypeScript types for webhook_deliveries"
affects: [03-lead-delivery, 04-dashboard]

# Tech tracking
tech-stack:
  added: [pg_net]
  patterns: [after-insert-trigger-for-async-http, delivery-status-lifecycle]

key-files:
  created:
    - supabase/migrations/00007_webhook_deliveries.sql
    - supabase/migrations/00008_fire_outbound_webhook.sql
    - supabase/migrations/00009_update_assign_lead.sql
  modified:
    - src/lib/types/database.ts

key-decisions:
  - "Delivery payload is a snapshot of lead data at assignment time (not a reference)"
  - "delivery_id returned as null when broker has no crm_webhook_url (graceful skip)"

patterns-established:
  - "Delivery status lifecycle: pending -> sent -> (failed -> retrying -> sent | failed_permanent)"
  - "pg_net trigger pattern: AFTER INSERT fires async HTTP POST, updates same row with request_id"

requirements-completed: [DLVR-01, DLVR-04]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 3 Plan 1: Webhook Delivery Pipeline Summary

**webhook_deliveries table with pg_net AFTER INSERT trigger that fires async HTTP POST to broker CRM on lead assignment**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T13:27:33Z
- **Completed:** 2026-03-12T13:29:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- webhook_deliveries table with status tracking, retry columns, indexes, and RLS
- fire_outbound_webhook() trigger that calls pg_net HTTP POST on delivery insert
- assign_lead() now creates a delivery record when broker has crm_webhook_url
- TypeScript types updated with full Row/Insert/Update/Relationships for webhook_deliveries

## Task Commits

Each task was committed atomically:

1. **Task 1: Create webhook_deliveries table, fire trigger, and update assign_lead()** - `a9a1a80` (feat)
2. **Task 2: Update TypeScript database types for webhook_deliveries** - `06f43f1` (feat)

## Files Created/Modified
- `supabase/migrations/00007_webhook_deliveries.sql` - webhook_deliveries table with status lifecycle, indexes, RLS
- `supabase/migrations/00008_fire_outbound_webhook.sql` - pg_net trigger function + AFTER INSERT trigger
- `supabase/migrations/00009_update_assign_lead.sql` - Updated assign_lead() with webhook delivery insertion
- `src/lib/types/database.ts` - Added webhook_deliveries types and fire_outbound_webhook function signature

## Decisions Made
- Delivery payload is a jsonb snapshot of lead data at assignment time, not a foreign key reference. This ensures the broker receives the exact data from the moment of assignment even if the lead record changes later.
- delivery_id is returned as null (not omitted) in the assign_lead() response when the broker has no crm_webhook_url. This keeps the return shape consistent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- webhook_deliveries table ready for retry logic (plan 03-02)
- pg_net request IDs stored for response checking in retry cron
- Status lifecycle supports full retry flow: failed -> retrying -> sent | failed_permanent

## Self-Check: PASSED

All 5 files verified present. Both task commits (a9a1a80, 06f43f1) verified in git log.

---
*Phase: 03-lead-delivery*
*Completed: 2026-03-12*
