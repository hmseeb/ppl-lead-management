---
phase: 23-data-isolation
plan: 01
subsystem: security
tags: [rls, data-isolation, broker-scoping, mutation-guard]

requires:
  - phase: 22-broker-auth
    provides: broker session with brokerId, getBrokerSession helper
provides:
  - Supabase RLS policies restricting anon reads to broker-owned rows
  - Broker-scoped portal query helpers (centralized data access)
  - Mutation ownership guards for portal server actions
  - Refactored portal pages using scoped queries
affects: [portal, rls, security]

tech-stack:
  added: []
  patterns: [broker-scoped-queries, mutation-ownership-guard, defense-in-depth-rls]

key-files:
  created:
    - supabase/migrations/00027_broker_rls_policies.sql
    - src/lib/portal/queries.ts
    - src/lib/portal/guard.ts
  modified:
    - src/app/portal/(protected)/layout.tsx
    - src/app/portal/(protected)/page.tsx

key-decisions:
  - "Primary isolation is application-level filtering (createAdminClient + .eq broker_id). RLS is defense-in-depth."
  - "RLS policies use current_setting('request.headers', true)::json->>'x-broker-id' for broker context on anon key"
  - "coalesce to empty string prevents accidental matches when header is missing"
  - "Centralized query helpers in src/lib/portal/queries.ts so no portal code can bypass broker filtering"
  - "BrokerAccessDeniedError custom error class for clear mutation rejection"

patterns-established:
  - "Portal data access: always use src/lib/portal/queries.ts, never raw createAdminClient in portal pages"
  - "Portal mutations: call requireBrokerSession() + assertBrokerOwns* before any write"
  - "RLS policies: anon role scoped by x-broker-id header, service role bypasses"

requirements-completed: [ISO-01, ISO-02, ISO-03]

duration: 6min
completed: 2026-03-17
---

# Plan 23-01: Data Isolation Summary

**Broker-scoped RLS policies, centralized portal query helpers, and mutation ownership guards**

## Performance

- **Duration:** 6 min
- **Tasks:** 4
- **Files created:** 3
- **Files modified:** 2

## Accomplishments
- RLS policies on leads, orders, deliveries restrict anon reads to broker-owned rows
- Centralized portal query module with getPortalBroker, getPortalLeads, getPortalOrders, getPortalDeliveries
- Mutation guard with requireBrokerSession, assertBrokerOwnsOrder, assertBrokerOwnsLead
- Refactored portal layout and home page to use scoped queries exclusively
- Zero direct createAdminClient usage in portal pages

## Files Created/Modified
- `supabase/migrations/00027_broker_rls_policies.sql` - Drops permissive anon policies, creates broker-scoped ones
- `src/lib/portal/queries.ts` - Broker-scoped query helpers (all filter by brokerId)
- `src/lib/portal/guard.ts` - Session validation + resource ownership assertions
- `src/app/portal/(protected)/layout.tsx` - Uses requireBrokerSession + getPortalBroker
- `src/app/portal/(protected)/page.tsx` - Uses requireBrokerSession + getPortalBroker

## Decisions Made
- Application-level filtering is primary mechanism (service role + explicit .eq filters)
- RLS is defense-in-depth for any future anon-key access paths
- brokers table keeps permissive anon read policy (needed by ppl-onboarding)
- activity_log and unassigned_queue keep existing policies (admin-only tables)

## Deviations from Plan
None

## Issues Encountered
None

## User Setup Required
None - uses existing Supabase configuration.

## Next Phase Readiness
- All portal queries are broker-scoped and ready for Phase 24+ features
- Mutation guards ready for any portal server actions that modify data
- RLS policies active for defense-in-depth

---
*Phase: 23-data-isolation*
*Completed: 2026-03-17*
