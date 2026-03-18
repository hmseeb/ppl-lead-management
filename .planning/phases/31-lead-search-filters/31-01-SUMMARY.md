---
phase: 31-lead-search-filters
plan: 01
subsystem: ui
tags: [nuqs, supabase, search, filters, pagination, portal]

requires:
  - phase: 28-portal-leads-page
    provides: "fetchBrokerLeadsPaginated query and LeadsTable component"
provides:
  - "Name search (ilike) on broker portal leads"
  - "Vertical dropdown filter on broker portal leads"
  - "Delivery status dropdown filter on broker portal leads"
  - "Filter-aware pagination links preserving query params"
affects: [portal-leads]

tech-stack:
  added: []
  patterns: ["nuqs URL state for portal filters", "delivery status pre-filter via deliveries table join"]

key-files:
  created:
    - src/components/portal/leads-filters.tsx
  modified:
    - src/lib/portal/queries.ts
    - src/app/portal/(protected)/leads/page.tsx
    - src/components/portal/leads-table.tsx

key-decisions:
  - "Delivery status filter pre-queries deliveries table for matching lead_ids rather than post-filtering in JS, enabling correct pagination counts"
  - "Used _all sentinel value pattern for base-ui Select (consistent with admin orders-filters)"

patterns-established:
  - "Portal filter components use nuqs with shallow:false for server re-render on filter change"
  - "Pagination links built via URLSearchParams to preserve all active filter params"

requirements-completed: [LSRCH-01, LSRCH-02, LSRCH-03, LSRCH-04]

duration: 2min
completed: 2026-03-18
---

# Phase 31 Plan 01: Lead Search Filters Summary

**Name search + vertical/delivery status filters on portal leads page using nuqs URL state and base-ui Select dropdowns**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T10:39:21Z
- **Completed:** 2026-03-18T10:41:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added search, vertical, and delivery status filter params to fetchBrokerLeadsPaginated query with ilike search and delivery status pre-filtering
- Created portal leads-filters.tsx client component with nuqs-bound search input and two base-ui Select dropdowns
- Updated server page with NuqsAdapter, filter param extraction, and force-dynamic export
- Updated pagination links to preserve all active filter query params via URLSearchParams

## Task Commits

Each task was committed atomically:

1. **Task 1: Add search and filter params to broker leads query** - `d6c1d25` (feat)
2. **Task 2: Build filter UI and wire to page with pagination integration** - `12acd91` (feat)

## Files Created/Modified
- `src/lib/portal/queries.ts` - Extended fetchBrokerLeadsPaginated with search/vertical/deliveryStatus filter params
- `src/components/portal/leads-filters.tsx` - New client component with search input, vertical Select, delivery status Select
- `src/app/portal/(protected)/leads/page.tsx` - Server page with NuqsAdapter, filter extraction, force-dynamic
- `src/components/portal/leads-table.tsx` - Pagination links preserve filter params, adaptive empty state message

## Decisions Made
- Delivery status filter pre-queries deliveries table for matching lead_ids (enables correct count for pagination)
- Used _all sentinel value for base-ui Select "All" options (consistent with existing admin orders-filters pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Portal leads page fully filterable by name, vertical, and delivery status
- All filters persist in URL (shareable, refreshable)
- Ready for any subsequent portal enhancements

## Self-Check: PASSED

All 4 files verified present. Both task commits (d6c1d25, 12acd91) verified in git log.

---
*Phase: 31-lead-search-filters*
*Completed: 2026-03-18*
