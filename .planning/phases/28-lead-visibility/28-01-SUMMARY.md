---
phase: 28-lead-visibility
plan: 01
subsystem: portal
tags: [portal, leads, broker-view, delivery-status, pagination, rls]

requires:
  - phase: 22-broker-auth
    provides: broker session, guard, portal layout
  - phase: 23-data-isolation
    provides: RLS policies, broker-scoped queries
  - phase: 26-portal-dashboard
    provides: portal home, dashboard cards, query patterns

provides:
  - paginated leads list page at /portal/leads
  - delivery status per lead (best status from deliveries table)
  - "Leads" navigation link in portal header

affects: [portal-leads, portal-queries, portal-header]

key-files:
  modified:
    - src/lib/portal/queries.ts
    - src/components/portal/portal-header.tsx
  created:
    - src/app/portal/(protected)/leads/page.tsx
    - src/components/portal/leads-table.tsx
    - .planning/phases/28-lead-visibility/28-01-PLAN.md

key-decisions:
  - "Delivery status fetched per page of lead IDs, not via join, to keep Supabase query simple"
  - "Best delivery status per lead prioritized: sent > retrying > queued > failed > failed_permanent"
  - "Server component with searchParams pagination, no client JS needed"
  - "20 leads per page default"
  - "RLS at DB layer + explicit broker_id filter in query = defense in depth"

requirements-completed: [LEAD-01, LEAD-02, LEAD-03]

duration: 5min
completed: 2026-03-17
---

# Plan 28-01: Lead Visibility Summary

**Brokers can now view a paginated list of all their leads with delivery status details.**

## Performance

- **Duration:** 5 min
- **Tasks:** 5
- **Files created:** 3
- **Files modified:** 2

## Accomplishments

### LEAD-01: Paginated Lead List
- `fetchBrokerLeadsPaginated(brokerId, page, perPage)` returns leads with exact count
- Server-side pagination via searchParams `?page=N`, 20 per page
- Sorted by assigned_at descending (newest first)

### LEAD-02: Lead Row Details
- Each row displays: name, vertical, credit score, funding amount, delivery status badge, assigned timestamp
- Delivery status color-coded: green (sent), amber (retrying), gray (queued), red (failed/failed_permanent)
- Funding amount formatted as USD currency
- Timestamps formatted as "MMM d, h:mm a"

### LEAD-03: Data Isolation (RLS)
- Query filters by `assigned_broker_id = brokerId` (application layer)
- RLS policies on leads table enforce broker can only see own leads (database layer)
- Broker cannot see any leads assigned to other brokers

## Task Commits

1. **All tasks** - `23cfe91` (feat)

## Files Created/Modified
- `src/lib/portal/queries.ts` - Added `fetchBrokerLeadsPaginated` with delivery status join
- `src/components/portal/leads-table.tsx` - Table component with delivery badges and pagination controls
- `src/app/portal/(protected)/leads/page.tsx` - Leads page with searchParams pagination
- `src/components/portal/portal-header.tsx` - Added "Leads" nav link with Users icon

## Deviations from Plan
None

## Issues Encountered
None

---
*Phase: 28-lead-visibility*
*Completed: 2026-03-17*
