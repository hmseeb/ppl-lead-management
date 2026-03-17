---
phase: 21-auto-reassignment
plan: 01
subsystem: assignment
tags: [auto-reassignment, unassigned-queue, scoring-engine, delivery]

requires:
  - phase: 14-pre-flight-validation
    provides: "Pre-flight checks in lead assignment flow"
  - phase: 15-scoring-engine-tier-gating
    provides: "0-100 scoring engine with tier gating"
provides:
  - "reassignUnassignedLeads() function that processes unassigned queue through scoring engine"
  - "Auto-reassignment triggered on order activation, unpausing, and creation"
  - "Activity log entries with 'auto_reassignment' event type"
affects: [assignment, orders, activity-log, delivery]

tech-stack:
  added: []
  patterns: [fire-and-forget-reassignment, queue-drain-on-activation]

key-files:
  created:
    - src/lib/assignment/reassign.ts
  modified:
    - src/lib/actions/orders.ts

key-decisions:
  - "Fire-and-forget pattern: reassignment runs async, never blocks the order action response"
  - "Sequential processing: leads processed one at a time to avoid race conditions on order capacity"
  - "Fault isolation: each lead wrapped in try/catch so one failure doesn't block others"
  - "Reuses existing assignLead() and dispatchDelivery() to ensure identical behavior to normal assignment"

patterns-established:
  - "Queue drain on activation: when an order becomes active, the unassigned queue is automatically processed"
  - "ReassignmentSummary return type for observability (processed, assigned, failed counts)"

requirements-completed: [REASS-01, REASS-02, REASS-03]

duration: 6min
completed: 2026-03-17
---

# Phase 21: Auto-Reassignment Summary

**Unassigned leads automatically matched and delivered when a qualifying order becomes available**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-17
- **Completed:** 2026-03-17
- **Tasks:** 1
- **Files created:** 1
- **Files modified:** 1

## Accomplishments
- Created `reassignUnassignedLeads()` that drains the unassigned queue through the full scoring engine
- Wired into `createOrder()` and `updateOrderStatus()` (when newStatus is 'active')
- Each auto-reassigned lead gets full 0-100 scoring, tier gating, and pre-flight checks via `assignLead()`
- Activity log entries created with `event_type: 'auto_reassignment'` including queue entry metadata
- Delivery dispatched via `dispatchDelivery()` for each successfully assigned lead
- Queue entries marked as resolved after successful assignment

## Task Commits

1. **Task 1: Create reassignUnassignedLeads and wire into order actions** - `c3b115b` (feat)

## Files Created/Modified
- `src/lib/assignment/reassign.ts` - New module with `reassignUnassignedLeads()` function
- `src/lib/actions/orders.ts` - Added import and fire-and-forget calls in `createOrder()` and `updateOrderStatus()`

## Decisions Made
- Fire-and-forget pattern so the admin gets instant response, reassignment happens in background
- Sequential lead processing (not parallel) to avoid race conditions on order capacity counters
- Each lead individually try/caught so a single failure doesn't block the rest of the queue
- Reuses `assignLead()` directly rather than reimplementing scoring, ensuring identical behavior

## Deviations from Plan
None

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auto-reassignment fully functional
- No blockers

---
*Phase: 21-auto-reassignment*
*Completed: 2026-03-17*
