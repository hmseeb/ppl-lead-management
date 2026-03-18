---
phase: 30-broker-reorder
plan: 01
subsystem: ui
tags: [react, next.js, stripe, portal, reorder]

# Dependency graph
requires:
  - phase: 25-order-creation-payment
    provides: "Stripe Checkout payment flow and order creation webhook"
provides:
  - "Reorder button on completed portal orders"
  - "Pre-fill support in OrderForm via URL query params"
  - "Contextual reorder/new order title in page and form"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URL query param forwarding for form pre-fill (searchParams -> props -> useState defaults)"

key-files:
  created: []
  modified:
    - src/components/portal/orders-list.tsx
    - src/components/portal/order-form.tsx
    - src/app/portal/(protected)/orders/new/page.tsx

key-decisions:
  - "Used Next.js Link with query params instead of server action for reorder navigation (client-side, no extra API call)"
  - "Back link changed from /portal to /portal/orders when reordering for better UX flow"

patterns-established:
  - "URL query param pre-fill pattern: reorder_* params -> searchParams -> component props -> useState defaults"

requirements-completed: [REORD-01, REORD-02, REORD-03, REORD-04]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 30 Plan 01: Broker Reorder Summary

**Reorder button on completed portal orders with pre-filled Stripe Checkout payment flow via URL query params**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T10:28:36Z
- **Completed:** 2026-03-18T10:30:15Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Completed orders in portal show a "Reorder" button with RefreshCw icon
- Clicking Reorder navigates to order form pre-filled with original vertical, credit tier, and lead count
- Form shows "Reorder Leads" title with contextual description in reorder mode
- Existing Stripe Checkout payment flow handles the rest (no changes to payment or webhook code)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Reorder button and pre-fill support** - `6ddb2e8` (feat)

## Files Created/Modified
- `src/components/portal/orders-list.tsx` - Added RefreshCw import and Reorder Link button on completed orders
- `src/components/portal/order-form.tsx` - Added OrderFormProps type with defaults, conditional reorder title/description
- `src/app/portal/(protected)/orders/new/page.tsx` - Converted to async with searchParams, extracts reorder params, passes as props

## Decisions Made
- Used Next.js Link with query params for reorder navigation instead of a server action. Simpler, no extra API call, and the form can still be modified before submitting.
- Changed the back link from /portal to /portal/orders when reordering so the broker returns to their orders list.
- Used `Promise<Record<string, string | string[] | undefined>>` for searchParams type to match Next.js 15 async page props convention.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Reorder flow complete, ready for Phase 31 (Lead Search & Filters)
- No blockers or concerns

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 30-broker-reorder*
*Completed: 2026-03-18*
