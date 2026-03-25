---
phase: 36-callback-scheduling
plan: 01
subsystem: infra
tags: [pg_cron, edge-functions, deno, webhooks, callbacks, supabase]

requires:
  - phase: 34-callback-api-broker-availability
    provides: callbacks table with pending/completed/cancelled status, fireCallbackWebhook payload format
provides:
  - fire-callback-webhooks Deno edge function for automated callback notifications
  - pg_cron job running every 5 minutes to invoke the edge function
  - reminder_sent_at column on callbacks table for dedup tracking
affects: [call-reporting-dashboard]

tech-stack:
  added: []
  patterns: [pg_cron -> net.http_post -> edge function for scheduled webhook dispatch, reminder dedup via timestamp column]

key-files:
  created:
    - supabase/functions/fire-callback-webhooks/index.ts
    - supabase/migrations/00032_callback_scheduling.sql
  modified: []

key-decisions:
  - "20-minute reminder window (not 15) to account for 5-minute cron cycle drift"
  - "Fire-and-forget webhook pattern matching existing callback_created behavior"
  - "Mark due callbacks as completed regardless of webhook delivery success"

patterns-established:
  - "Reminder dedup via reminder_sent_at timestamp column checked in query filter"

requirements-completed: [CALL-03, CALL-04]

duration: 3min
completed: 2026-03-25
---

# Phase 36 Plan 01: Callback Scheduling Summary

**pg_cron job every 5 minutes invoking fire-callback-webhooks edge function that sends callback_reminder and callback_due webhooks to broker CRM endpoints**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25
- **Completed:** 2026-03-25
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created fire-callback-webhooks Deno edge function that queries pending callbacks, fires callback_due webhooks for callbacks at/past scheduled time, and callback_reminder webhooks ~15 min before
- Added reminder_sent_at column to callbacks table preventing duplicate reminder notifications across cron runs
- Scheduled pg_cron job every 5 minutes using vault-sourced auth matching the daily-digest pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: fire-callback-webhooks edge function** - `75bd793` (feat)
2. **Task 2: pg_cron migration for callback scheduling** - `54c3ea5` (feat)

## Files Created/Modified
- `supabase/functions/fire-callback-webhooks/index.ts` - Edge function querying pending callbacks, firing webhooks, marking completed
- `supabase/migrations/00032_callback_scheduling.sql` - ALTER TABLE + cron.schedule with vault secrets

## Decisions Made
- 20-minute query window for reminders ensures 5-minute cron cycle catches callbacks at the ~15 minute mark
- Fire-and-forget webhook pattern (matching callback_created) so cron cycle is never blocked by slow endpoints
- Due callbacks marked completed after webhook fire regardless of delivery success, consistent with existing fire-and-forget approach

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - vault secrets (supabase_url, service_role_key) already configured from Phase 6. Edge function must be deployed via `supabase functions deploy fire-callback-webhooks`.

## Next Phase Readiness
- Callback scheduling complete, brokers receive automated CRM notifications
- Phase 37 (Call Reporting Dashboard) can now show upcoming callbacks with their status

---
*Phase: 36-callback-scheduling*
*Completed: 2026-03-25*
