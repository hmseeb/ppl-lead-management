---
phase: 34-callback-api-broker-availability
plan: 01
subsystem: api
tags: [callbacks, webhooks, supabase, zod, rest-api]

requires:
  - phase: existing infrastructure
    provides: brokers table, leads table, activity_log, update_updated_at trigger, webhook patterns
provides:
  - callbacks table with pending/completed/cancelled status tracking
  - POST /api/callbacks booking endpoint with Zod validation
  - DELETE /api/callbacks/[id] cancellation endpoint
  - fireCallbackWebhook utility for callback lifecycle events
  - callbacks type definitions in database.ts
affects: [callback-scheduling, call-reporting-dashboard]

tech-stack:
  added: []
  patterns: [fire-and-forget webhook with AbortController timeout, callback lifecycle webhooks]

key-files:
  created:
    - supabase/migrations/00030_callbacks.sql
    - src/lib/webhooks/callback-webhook.ts
    - src/app/api/callbacks/route.ts
    - src/app/api/callbacks/[id]/route.ts
  modified:
    - src/lib/types/database.ts

key-decisions:
  - "Fire-and-forget webhook pattern (matching existing dispatchDelivery pattern) so API response is never blocked by webhook delivery"
  - "10-second AbortController timeout matching test-webhook route pattern"
  - "Zod validation with future-time refinement on scheduled_time"

patterns-established:
  - "Callback webhook payload structure: { type, callback, lead, broker } for all lifecycle events"

requirements-completed: [CALL-01, CALL-02, CALL-05, CALL-06, CALL-07]

duration: 4min
completed: 2026-03-25
---

# Phase 34 Plan 01: Callbacks Table + Booking/Cancellation APIs Summary

**Callbacks table with booking/cancellation REST API, Zod validation, and fire-and-forget CRM webhook notifications for callback lifecycle events**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-25T12:27:32Z
- **Completed:** 2026-03-25T12:31:32Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created callbacks table with status check constraint, broker/lead foreign keys, and indexes for pg_cron
- Built POST /api/callbacks with full Zod validation (uuid, datetime, future-time check), lead/broker existence verification, and 201 response
- Built DELETE /api/callbacks/[id] with idempotency protection (409 for already cancelled/completed), status update, and 200 response
- Created reusable fireCallbackWebhook utility supporting callback_created and callback_cancelled event types with full lead+broker payload
- Updated database.ts with callbacks table types

## Task Commits

Each task was committed atomically:

1. **Task 1: Callbacks table migration + webhook utility** - `bc80a04` (feat)
2. **Task 2: Booking and cancellation API routes** - `77daa03` (feat)

## Files Created/Modified
- `supabase/migrations/00030_callbacks.sql` - Callbacks table, indexes, trigger
- `src/lib/webhooks/callback-webhook.ts` - Shared webhook firing utility
- `src/app/api/callbacks/route.ts` - POST endpoint for booking callbacks
- `src/app/api/callbacks/[id]/route.ts` - DELETE endpoint for cancelling callbacks
- `src/lib/types/database.ts` - Added callbacks table type definitions

## Decisions Made
- Fire-and-forget webhook pattern (matching existing dispatchDelivery approach) to never block API response
- 10-second AbortController timeout consistent with test-webhook route
- Zod validation with .refine() for future-time enforcement on scheduled_time

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Callbacks table and APIs ready for Phase 36 (pg_cron scheduling)
- Webhook payload structure established for callback_reminder and callback_due events

---
*Phase: 34-callback-api-broker-availability*
*Completed: 2026-03-25*
