---
phase: 07-real-time-alerts
plan: 01
subsystem: database
tags: [postgres, triggers, pg_net, sms, alerts, dedup]

# Dependency graph
requires:
  - phase: 06-alert-foundation
    provides: admin_settings table, alert_state dedup table, send-alert edge function
provides:
  - notify_delivery_failed() trigger function wired to deliveries table
  - notify_unassigned_lead() trigger function wired to unassigned_queue table
  - Real-time SMS alerts for delivery failures and unassigned leads
affects: [08-delivery-stats-dashboard, 09-daily-digest]

# Tech tracking
tech-stack:
  added: []
  patterns: [WHEN-clause filtered AFTER UPDATE trigger, dedup-first alert pattern, SECURITY DEFINER for RLS bypass]

key-files:
  created:
    - supabase/migrations/00014_alert_triggers.sql
  modified: []

key-decisions:
  - "Used PERFORM instead of SELECT INTO for pg_net call since we don't need the request_id"
  - "WHEN clause on trigger definition (not inside function) to prevent unnecessary function calls"
  - "Dedup context: broker_id for delivery failures (correlated endpoint failures), lead_id for unassigned (independent events)"
  - "NULL-safe name resolution with TRIM + NULLIF + fallback chain (email, phone, id)"

patterns-established:
  - "WHEN-clause filtered trigger: use on tables with many UPDATE events to limit function invocations"
  - "Dedup-first alert pattern: check alert_state before building pg_net payload to avoid wasted edge function calls"
  - "SECURITY DEFINER + SET search_path for trigger functions writing to RLS-protected tables"

requirements-completed: [ALRT-02, ALRT-03]

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 7 Plan 01: Alert Triggers Summary

**Two SECURITY DEFINER trigger functions wiring Phase 6 alert infrastructure to deliveries.failed_permanent and unassigned_queue INSERT events, with dedup-first pattern and NULL-safe name resolution**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T02:02:33Z
- **Completed:** 2026-03-13T02:04:41Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Delivery failure trigger fires SMS alert when status transitions to failed_permanent, with WHEN clause preventing unnecessary function calls
- Unassigned lead trigger fires SMS alert on every INSERT into unassigned_queue
- Both functions check admin_settings enabled flags, dedup via alert_state, resolve human-readable names, read Vault secrets, and UPSERT alert_state after sending

## Task Commits

Each task was committed atomically:

1. **Task 1: Create delivery failure trigger function and trigger definition** - `faa905a` (feat)

Note: Task 2 (unassigned lead trigger) was included in the same commit because both trigger functions belong to a single migration file (00014_alert_triggers.sql). The plan specified "append to the same migration file" which was fulfilled by creating the complete file in Task 1.

## Files Created/Modified
- `supabase/migrations/00014_alert_triggers.sql` - Both trigger functions (notify_delivery_failed, notify_unassigned_lead) and both trigger definitions (trg_alert_delivery_failed, trg_alert_unassigned_lead)

## Decisions Made
- Used PERFORM for pg_net call (cleaner than SELECT INTO since we don't need request_id)
- WHEN clause on trigger definition rather than conditional logic inside function body (PostgreSQL best practice, prevents function invocation entirely)
- Dedup context: broker_id for failures (correlated), lead_id for unassigned (independent)
- NULL-safe name resolution: TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) with NULLIF and fallback to email/phone/id

## Deviations from Plan

None - plan executed exactly as written. The research provided battle-tested code examples that mapped directly to the implementation.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The triggers use existing Vault secrets (supabase_url, service_role_key) already configured in Phase 6.

## Next Phase Readiness
- Phase 7 complete: admin receives SMS within seconds of delivery failures and unassigned leads
- Phase 8 (Delivery Stats Dashboard) can proceed independently (no dependency on Phase 7)
- Phase 9 (Daily Digest) can proceed (depends on Phase 6 which is complete)

## Self-Check: PASSED

- FOUND: supabase/migrations/00014_alert_triggers.sql
- FOUND: 07-01-SUMMARY.md
- FOUND: faa905a (Task 1 commit)

---
*Phase: 07-real-time-alerts*
*Completed: 2026-03-13*
