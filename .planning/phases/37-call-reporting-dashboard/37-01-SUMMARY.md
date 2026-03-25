---
phase: 37-call-reporting-dashboard
plan: 01
subsystem: ui
tags: [next.js, supabase, nuqs, lucide-react, shadcn, call-reporting]

requires:
  - phase: 35-call-logging
    provides: call_logs table with outcome column
provides:
  - /calls page with KPI cards and broker/date filters
  - fetchCallKpis query function for call outcome counts
  - CallReportingFilters component with nuqs server sync
  - CallKpiCards component with 5 outcome cards
affects: [37-02-call-outcome-chart, call-reporting]

tech-stack:
  added: []
  patterns: [call reporting page following dashboard server component pattern]

key-files:
  created:
    - src/app/(dashboard)/calls/page.tsx
    - src/lib/queries/call-reporting.ts
    - src/components/calls/call-kpi-cards.tsx
    - src/components/calls/call-reporting-filters.tsx
  modified:
    - src/components/layout/sidebar.tsx

key-decisions:
  - "Reused DashboardFilters type and getDateRange helper instead of creating new filter types"
  - "No vertical filter on call reporting page since calls are broker-scoped, not vertical-scoped"

patterns-established:
  - "Call reporting queries follow same createAdminClient + Promise.all count pattern as dashboard.ts"

requirements-completed: [RPT-01, RPT-03]

duration: 2min
completed: 2026-03-25
---

# Phase 37 Plan 01: Call Reporting Page with KPI Cards Summary

**Call reporting page at /calls with 5 KPI cards (total, transferred, callbacks booked, no answer, voicemail) and broker/date filtering via nuqs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T13:08:55Z
- **Completed:** 2026-03-25T13:10:56Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- fetchCallKpis query function with parallel Promise.all count queries against call_logs table
- 5 KPI cards showing call outcome counts with percentage-of-total subtitles
- Broker dropdown and date preset/range filters using nuqs shallow:false for server refetch
- "Calls" nav item added to sidebar between Activity and Settings

## Task Commits

Each task was committed atomically:

1. **Task 1: Call reporting queries and filter types** - `ba0270d` (feat)
2. **Task 2: Call reporting page, filters, KPI cards, and sidebar nav** - `cbc15d4` (feat)

## Files Created/Modified
- `src/lib/queries/call-reporting.ts` - fetchCallKpis with broker/date filtering
- `src/components/calls/call-kpi-cards.tsx` - 5 KPI cards with lucide icons and percentage subtitles
- `src/components/calls/call-reporting-filters.tsx` - Date presets, date range, broker dropdown via nuqs
- `src/app/(dashboard)/calls/page.tsx` - Server component with NuqsAdapter and Promise.all data fetching
- `src/components/layout/sidebar.tsx` - Added Calls nav item with Phone icon

## Decisions Made
- Reused existing DashboardFilters type and getDateRange helper (no new types needed)
- Excluded vertical filter since call reporting is broker-scoped
- Used same card styling pattern from existing KPI cards (text-3xl font-bold font-mono)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Page ready for Plan 37-02 to add call outcome chart and upcoming callbacks table
- Comment placeholder left in page.tsx for chart/callbacks integration

---
*Phase: 37-call-reporting-dashboard*
*Completed: 2026-03-25*
