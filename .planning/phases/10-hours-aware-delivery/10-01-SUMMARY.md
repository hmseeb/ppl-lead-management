---
phase: 10-hours-aware-delivery
plan: 01
subsystem: database
tags: [postgres, plpgsql, timezone, delivery-pipeline, contact-hours]

# Dependency graph
requires:
  - phase: 09-daily-digest
    provides: Existing delivery infrastructure (assign_lead, fire_outbound_webhook, fire_ghl_delivery)
provides:
  - is_within_contact_hours() SQL helper function
  - 'queued' delivery status for out-of-hours leads
  - Updated assign_lead() with hours-aware delivery status
  - Updated triggers that skip queued deliveries
affects: [11-queue-processing, 12-admin-visibility]

# Tech tracking
tech-stack:
  added: []
  patterns: [timezone-aware-delivery, queued-status-pattern]

key-files:
  created:
    - supabase/migrations/00016_hours_aware_delivery.sql
  modified:
    - src/lib/types/database.ts

key-decisions:
  - "Default timezone is America/Los_Angeles when broker has no timezone set (per TZ-01)"
  - "v_delivery_status computed ONCE before all INSERT statements for consistency"
  - "Unknown contact_hours values treated as 'anytime' (fail-open for delivery)"

patterns-established:
  - "Hours check pattern: is_within_contact_hours(broker_id) returns boolean, called in assign_lead"
  - "Queued skip pattern: triggers check NEW.status = 'queued' and RETURN NEW early"

requirements-completed: [HOUR-01, HOUR-02, HOUR-03, TZ-01, TZ-02]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 10 Plan 01: Hours-Aware Delivery Summary

**Timezone-aware is_within_contact_hours() helper that queues out-of-window deliveries instead of firing, with trigger guards on both webhook and GHL channels**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T11:08:38Z
- **Completed:** 2026-03-13T11:11:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created is_within_contact_hours() function handling anytime, business_hours (9-5), and custom (AM/PM parsing) modes with weekend_pause support
- Updated assign_lead() to compute v_delivery_status once and use it across all delivery channel INSERTs
- Updated both fire_outbound_webhook() and fire_ghl_delivery() trigger functions to skip queued rows
- Added 'queued' to deliveries CHECK constraint and partial index

## Task Commits

Each task was committed atomically:

1. **Task 1: Create hours-aware delivery migration** - `c5c5200` (feat)
2. **Task 2: Update TypeScript database types** - `1b0580c` (feat)

## Files Created/Modified
- `supabase/migrations/00016_hours_aware_delivery.sql` - Migration with queued status, is_within_contact_hours(), updated assign_lead(), updated triggers
- `src/lib/types/database.ts` - Added timezone to brokers type, is_within_contact_hours to Functions

## Decisions Made
- Default timezone is America/Los_Angeles when broker has no timezone set (per TZ-01 requirement)
- v_delivery_status computed ONCE before delivery inserts, not per-channel, for consistency
- Unknown contact_hours values treated as 'anytime' (fail-open to avoid blocking deliveries)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 (Queue Processing) can now build the pg_cron job to release queued deliveries
- The 'queued' status and is_within_contact_hours() function are ready for reuse
- No blockers

## Self-Check: PASSED

All files and commits verified.

---
*Phase: 10-hours-aware-delivery*
*Completed: 2026-03-13*
