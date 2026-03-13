---
phase: 06-alert-foundation
plan: "02"
subsystem: database
tags: [postgres, dedup, pg_cron, rls, alerts]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Supabase project with pg_cron and pg_net extensions"
provides:
  - "alert_state table with composite unique constraint for deduplication"
  - "Lookup index covering Phase 7 dedup query pattern"
  - "Weekly pg_cron cleanup job for stale alert rows"
affects: [07-alert-triggers]

# Tech tracking
tech-stack:
  added: []
  patterns: ["alert dedup via UNIQUE(alert_type, context_id) + time window check"]

key-files:
  created:
    - supabase/migrations/00013_alert_dedup.sql
  modified: []

key-decisions:
  - "No write RLS policy for anon; Phase 7 trigger functions run as SECURITY DEFINER"
  - "7-day cleanup window aligns with weekly cron cadence (stale rows well past 15-min dedup window)"
  - "context_id is text type to support both broker_id and lead_id formats"

patterns-established:
  - "Alert dedup pattern: check last_sent_at > now() - interval, update suppressed_count if recent, upsert if not"

requirements-completed: [ALRT-04]

# Metrics
duration: 1min
completed: 2026-03-13
---

# Phase 6 Plan 02: Alert Dedup Table Summary

**alert_state deduplication table with composite unique constraint, lookup index, RLS, and weekly pg_cron cleanup to prevent alert storms**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-13T01:46:38Z
- **Completed:** 2026-03-13T01:47:36Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- alert_state table with UNIQUE(alert_type, context_id) prevents duplicate alerts within dedup window
- Lookup index on (alert_type, context_id, last_sent_at) covers the exact query pattern Phase 7 triggers will run
- Weekly pg_cron cleanup job (Sunday midnight UTC) removes rows older than 7 days
- suppressed_count and last_payload columns provide observability and debugging capability

## Task Commits

Each task was committed atomically:

1. **Task 1: Create alert_state deduplication table and cleanup cron** - `bc77180` (feat)

## Files Created/Modified
- `supabase/migrations/00013_alert_dedup.sql` - Alert dedup table, lookup index, RLS policy, weekly cleanup cron, Phase 7 usage docs

## Decisions Made
- No write RLS policy for anon role; Phase 7 trigger functions will run as SECURITY DEFINER to insert/update alert_state rows
- 7-day cleanup window is conservative (15-min dedup window means rows are stale within hours)
- context_id uses text type for flexibility across broker_id and lead_id formats

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- alert_state table ready for Phase 7 trigger functions to check dedup windows
- Phase 7 triggers will use the documented INSERT ... ON CONFLICT pattern for upserts
- No blockers

---
*Phase: 06-alert-foundation*
*Completed: 2026-03-13*

## Self-Check: PASSED
- [x] supabase/migrations/00013_alert_dedup.sql exists
- [x] Commit bc77180 exists in git log
