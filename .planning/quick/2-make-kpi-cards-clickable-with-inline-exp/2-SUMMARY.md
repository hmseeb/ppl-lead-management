---
phase: quick
plan: 2
subsystem: ui
tags: [react, server-actions, accordion, supabase, date-fns]

requires:
  - phase: 04-admin-dashboard
    provides: KPI cards component and dashboard queries
provides:
  - Interactive KPI cards with lazy-loaded expandable preview tables
  - Server actions for fetching KPI detail rows
affects: [dashboard, overview-page]

tech-stack:
  added: []
  patterns: [server-action-driven lazy data loading, accordion UI with cached preview data]

key-files:
  created:
    - src/lib/actions/dashboard.ts
  modified:
    - src/components/dashboard/kpi-cards.tsx

key-decisions:
  - "Cache fetched preview data client-side to avoid re-fetching on re-expand"
  - "CSS max-height transition for smooth expand/collapse instead of JS animation"

patterns-established:
  - "Server action preview pattern: limit 8 rows, return empty array on error"

requirements-completed: [QUICK-2]

duration: 2min
completed: 2026-03-13
---

# Quick Task 2: Make KPI Cards Clickable Summary

**Clickable KPI cards with lazy-loaded accordion preview tables and "View all" navigation links**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T09:57:09Z
- **Completed:** 2026-03-13T09:59:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 5 server actions for lazy-fetching KPI detail rows (leads today, assigned, unassigned, active brokers, active orders)
- Interactive accordion behavior: click to expand, click again to collapse, only one open at a time
- Data cached client-side after first fetch so re-expanding is instant
- Per-card-type compact tables with appropriate columns
- "View all" links with correct filter parameters for each KPI type

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server actions for KPI detail row fetching** - `74f847f` (feat)
2. **Task 2: Rewrite KPI cards as interactive client component** - `7ae360a` (feat)

## Files Created/Modified
- `src/lib/actions/dashboard.ts` - 5 server actions for lazy-fetching KPI preview data (8 rows max each)
- `src/components/dashboard/kpi-cards.tsx` - Converted to 'use client' with accordion expand/collapse, preview tables, and "View all" links

## Decisions Made
- Cache fetched preview data in client state to avoid redundant server calls on re-expand
- Use CSS max-height transition (0 to 500px) for smooth expand/collapse animation
- Each server action returns empty array on error for graceful degradation
- No changes needed to dashboard page.tsx since KpiData is serializable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

All files exist. All commits verified.

---
*Quick Task: 2-make-kpi-cards-clickable-with-inline-exp*
*Completed: 2026-03-13*
