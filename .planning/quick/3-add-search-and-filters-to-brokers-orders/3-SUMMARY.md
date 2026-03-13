---
phase: quick
plan: 3
subsystem: ui
tags: [nuqs, search, filters, supabase, next.js]

requires:
  - phase: 04-admin-dashboard
    provides: "Table pages for brokers, orders, unassigned, activity"
provides:
  - "Server-side search + filter UI on all 4 table pages"
  - "Consistent filter pattern across brokers, orders, unassigned, activity"
affects: []

tech-stack:
  added: []
  patterns: ["nuqs shallow:false filter pattern replicated to all table pages"]

key-files:
  created:
    - src/components/brokers/brokers-filters.tsx
    - src/components/orders/orders-filters.tsx
    - src/components/unassigned/unassigned-filters.tsx
  modified:
    - src/components/activity/activity-filters.tsx
    - src/lib/queries/brokers.ts
    - src/lib/queries/orders.ts
    - src/lib/queries/unassigned.ts
    - src/lib/queries/activity.ts
    - src/app/(dashboard)/brokers/page.tsx
    - src/app/(dashboard)/orders/page.tsx
    - src/app/(dashboard)/unassigned/page.tsx
    - src/app/(dashboard)/activity/page.tsx

key-decisions:
  - "Used referencedTable option in supabase .or() for searching joined broker/lead names on orders and unassigned pages"

patterns-established:
  - "All table pages follow identical filter pattern: nuqs useQueryState with shallow:false, throttled search, native select dropdowns, clear button"

requirements-completed: []

duration: 2min
completed: 2026-03-13
---

# Quick Task 3: Add Search and Filters to Brokers/Orders Summary

**Server-side search and filter bars on all 4 table pages (brokers, orders, unassigned, activity) using nuqs shallow:false pattern matching leads page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T10:09:04Z
- **Completed:** 2026-03-13T10:11:34Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- All 4 query functions accept and apply search + relevant filter parameters server-side
- 3 new filter components created (brokers, orders, unassigned) + 1 updated (activity)
- All pages wrapped in NuqsAdapter with consistent search/filter UX matching leads page
- Build passes clean with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add filter params to all 4 query functions** - `f02ad7c` (feat)
2. **Task 2: Create filter components and wire into pages** - `2b92f68` (feat)

## Files Created/Modified
- `src/components/brokers/brokers-filters.tsx` - Search + assignment_status filter for brokers
- `src/components/orders/orders-filters.tsx` - Search + status + vertical filter for orders
- `src/components/unassigned/unassigned-filters.tsx` - Search + reason filter for unassigned
- `src/components/activity/activity-filters.tsx` - Added search input before existing filters
- `src/lib/queries/brokers.ts` - Added search/assignment_status to BrokerFilters and query
- `src/lib/queries/orders.ts` - Added search/status/vertical to OrderFilters and query
- `src/lib/queries/unassigned.ts` - Added search/reason to UnassignedFilters and query
- `src/lib/queries/activity.ts` - Added search to ActivityFilters and query
- `src/app/(dashboard)/brokers/page.tsx` - NuqsAdapter + BrokersFilters + param passing
- `src/app/(dashboard)/orders/page.tsx` - NuqsAdapter + OrdersFilters + param passing
- `src/app/(dashboard)/unassigned/page.tsx` - NuqsAdapter + UnassignedFilters + param passing
- `src/app/(dashboard)/activity/page.tsx` - Added search param to fetchActivityLog call

## Decisions Made
- Used supabase `referencedTable` option in `.or()` to search joined broker/lead names on orders and unassigned pages (avoids client-side filtering or RPC calls)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

---
*Quick Task: 3-add-search-and-filters-to-brokers-orders*
*Completed: 2026-03-13*
