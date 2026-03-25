---
phase: 37-call-reporting-dashboard
plan: 02
subsystem: ui
tags: [recharts, supabase, next.js, shadcn, date-fns, call-reporting]

requires:
  - phase: 37-call-reporting-dashboard
    provides: /calls page, fetchCallKpis, CallKpiCards, CallReportingFilters
provides:
  - Stacked bar chart of call outcomes over time
  - Upcoming callbacks table with lead/broker details
  - fetchCallOutcomeVolume query with efficient single-query bucketing
  - fetchUpcomingCallbacks query with lead/broker joins
affects: [call-reporting]

tech-stack:
  added: []
  patterns: [single-query-then-bucket pattern for chart data to avoid N+1]

key-files:
  created:
    - src/components/calls/call-outcome-chart.tsx
    - src/components/calls/upcoming-callbacks.tsx
  modified:
    - src/lib/queries/call-reporting.ts
    - src/app/(dashboard)/calls/page.tsx

key-decisions:
  - "Used single query + TypeScript bucketing instead of per-bucket queries to avoid N+1 explosion"
  - "Upcoming callbacks are not filtered by date range since they always show future pending callbacks"

patterns-established:
  - "Single-query-then-bucket: fetch all rows in range, bucket in TypeScript for chart data"

requirements-completed: [RPT-02, RPT-04]

duration: 2min
completed: 2026-03-25
---

# Phase 37 Plan 02: Call Outcome Chart and Upcoming Callbacks Summary

**Stacked bar chart of call outcomes over time (recharts) with daily/weekly bucketing, plus upcoming callbacks table with lead/broker details**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T13:12:22Z
- **Completed:** 2026-03-25T13:14:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- fetchCallOutcomeVolume uses single query + TypeScript bucketing (1 query vs potentially 120+)
- Stacked bar chart with 4 color-coded outcome types and recharts Legend
- fetchUpcomingCallbacks with lead/broker joins sorted by soonest scheduled time
- Upcoming callbacks table showing lead name, broker name, scheduled time, and pending status badge

## Task Commits

Each task was committed atomically:

1. **Task 1: Call outcome volume and upcoming callbacks queries** - `28ea4d5` (feat)
2. **Task 2: Call outcome chart, upcoming callbacks table, and page integration** - `afd504a` (feat)

## Files Created/Modified
- `src/lib/queries/call-reporting.ts` - Added fetchCallOutcomeVolume and fetchUpcomingCallbacks
- `src/components/calls/call-outcome-chart.tsx` - Stacked bar chart with dark/light theme support
- `src/components/calls/upcoming-callbacks.tsx` - Table of pending callbacks with lead/broker details
- `src/app/(dashboard)/calls/page.tsx` - Integrated chart and callbacks table with parallel data fetching

## Decisions Made
- Used single-query-then-bucket pattern to avoid N+1 query explosion for chart data
- Upcoming callbacks are not scoped by date range filters (always show future pending)
- Top bar in stacked chart gets rounded corners (voicemail), bottom bar doesn't (transferred)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 37 complete. All 4 reporting requirements (RPT-01 through RPT-04) implemented.
- /calls page has KPI cards, outcome chart, and upcoming callbacks table.

---
*Phase: 37-call-reporting-dashboard*
*Completed: 2026-03-25*
