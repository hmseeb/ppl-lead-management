---
phase: 01-foundation-assignment-engine
plan: 03
subsystem: database, assignment-engine
tags: [postgres, plpgsql, advisory-locks, weighted-round-robin, supabase-rpc, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: orders, leads, activity_log, unassigned_queue tables and Supabase admin client
provides:
  - assign_lead() Postgres function with advisory lock serialization
  - build_match_failure_reason() helper for human-readable unassignment reasons
  - TypeScript assignLead() RPC wrapper
  - Test suite validating 8 assignment scenarios (27 assertions)
  - Seed data for testing
affects: [02-01-PLAN, 02-02-PLAN]

# Tech tracking
tech-stack:
  added: [tsx]
  patterns: [advisory-lock-serialization, weighted-round-robin-rotation, rpc-wrapper-pattern]

key-files:
  created:
    - supabase/migrations/00006_assign_lead_function.sql
    - src/lib/assignment/assign.ts
    - scripts/test-assignment.ts
    - supabase/seed.sql
  modified:
    - src/lib/types/database.ts

key-decisions:
  - "Used pg_advisory_xact_lock(1,0) two-integer form to avoid collision with GoTrue single-bigint locks"
  - "Combined both functions (build_match_failure_reason + assign_lead) in a single migration file for atomic deployment"
  - "Weighted rotation formula: leads_remaining/total_leads DESC, last_assigned_at ASC NULLS FIRST"
  - "Used b.assignment_status (not b.status) for broker active check since status stores onboarding state"

patterns-established:
  - "Assignment function pattern: advisory lock -> fetch lead -> find best order -> assign or queue -> log -> return jsonb"
  - "RPC wrapper pattern: TypeScript function calls supabase.rpc() with typed result"
  - "Test script pattern: standalone tsx script with seed/test/cleanup lifecycle against live Supabase"

requirements-completed: [ASGN-01, ASGN-02, ASGN-03, ASGN-04, ASGN-05, ASGN-06, ASGN-07]

# Metrics
duration: 7min
completed: 2026-03-12
---

# Phase 1 Plan 03: Assignment Engine Summary

**assign_lead() Postgres function with advisory-lock serialization, weighted round-robin rotation, and 8-scenario test suite (27/27 passing)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-12T12:44:12Z
- **Completed:** 2026-03-12T12:51:42Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- assign_lead() Postgres function deployed to Supabase with pg_advisory_xact_lock(1,0) for race-condition-proof serialization
- Weighted round-robin rotation: leads_remaining/total_leads ratio with last_assigned_at tiebreaker
- build_match_failure_reason() provides 6 levels of diagnostic detail for unmatched leads
- All 8 test scenarios pass: basic assignment, weighted rotation, unmatched leads, credit score filtering, bonus mode, auto-complete, paused orders, paused brokers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create assign_lead() and build_match_failure_reason() Postgres functions** - `b2f533e` (feat)
2. **Task 2: Create TypeScript wrapper, seed data, and test the assignment engine** - `5546bd9` (feat)

## Files Created/Modified
- `supabase/migrations/00006_assign_lead_function.sql` - Both Postgres functions (build_match_failure_reason + assign_lead)
- `src/lib/assignment/assign.ts` - TypeScript RPC wrapper exporting assignLead()
- `scripts/test-assignment.ts` - 8-scenario test suite with 27 assertions
- `supabase/seed.sql` - Test seed data (3 orders, 5 leads linked to existing brokers)
- `src/lib/types/database.ts` - Regenerated with assign_lead and build_match_failure_reason function types

## Decisions Made
- **Advisory lock form:** Used pg_advisory_xact_lock(1, 0) two-integer form instead of single-bigint to avoid collision with GoTrue's internal locks. Namespace=1, id=0 for global assignment serialization.
- **Single migration file:** Combined both functions into 00006_assign_lead_function.sql rather than separate files, since assign_lead depends on build_match_failure_reason.
- **assignment_status column:** Used b.assignment_status (not b.status) for broker eligibility since status stores onboarding state from ppl-onboarding.
- **Test 3 fix:** Removed "All" catch-all order from unmatched lead test scenario since it correctly matches any vertical, making the test invalid with it present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unmatched lead test scenario**
- **Found during:** Task 2 (Test suite execution)
- **Issue:** Test 3 expected "Residential Mortgage" to be unmatched, but Order B with verticals=['All'] correctly matched it. Test was wrong, not the function.
- **Fix:** Modified Test 3 to seed only specific-vertical orders (no "All" order) so unmatched scenario is valid
- **Files modified:** scripts/test-assignment.ts
- **Verification:** All 27 assertions pass
- **Committed in:** 5546bd9 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test logic)
**Impact on plan:** Test scenario correction only. No scope creep.

## Issues Encountered
- assign.ts was already committed in 01-02 plan with identical content (including linter's `as unknown as` cast). No conflict, just noted it was not a new file in Task 2 commit.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- assign_lead() is deployed and tested, ready for webhook integration in Phase 2
- TypeScript wrapper available for any code path that needs to trigger assignment
- Test script can be re-run at any time to validate assignment behavior after changes

## Self-Check: PASSED

All 5 key files verified present. All 2 task commits verified in git history.

---
*Phase: 01-foundation-assignment-engine*
*Completed: 2026-03-12*
