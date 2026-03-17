---
phase: 26-portal-dashboard
plan: 01
subsystem: portal
tags: [portal, dashboard, broker-view, orders, leads, spend, delivery-health]

requires:
  - phase: 22-broker-auth
    provides: broker session, guard, portal layout
  - phase: 23-data-isolation
    provides: broker-scoped queries
  - phase: 24-pricing-engine
    provides: lead_prices table for spend calculation

provides:
  - broker dashboard with active orders + progress bars
  - recent leads table (last 20)
  - spend summary (all-time, this month, active order value)
  - delivery health (success rates by channel)

affects: [portal-home, portal-queries]

key-files:
  modified:
    - src/lib/portal/queries.ts
    - src/app/portal/(protected)/page.tsx
  created:
    - src/components/portal/dashboard-cards.tsx
    - .planning/phases/26-portal-dashboard/26-01-PLAN.md

key-decisions:
  - "Spend calculated from lead_prices joined with delivered leads, not from order columns"
  - "Active order value estimated as total_leads * price for first vertical in order"
  - "All queries broker-scoped, all data fetched in parallel via Promise.all"
  - "Server components only, no client-side JS needed"
  - "Progress bars use inline div width styling with gradient fill"
  - "Delivery health color-coded: green 90%+, amber 70-89%, red <70%"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04]

duration: 5min
completed: 2026-03-17
---

# Plan 26-01: Portal Dashboard Summary

**Broker portal home now shows active orders, recent leads, spend summary, and delivery health**

## Performance

- **Duration:** 5 min
- **Tasks:** 4
- **Files created:** 2
- **Files modified:** 2

## Accomplishments

### DASH-01: Active Orders with Progress Bars
- `fetchBrokerActiveOrders()` returns active orders with total_leads, leads_delivered, leads_remaining
- ActiveOrdersCard renders gradient progress bars with percentage and remaining count
- Shows verticals, credit score minimum, and priority badge per order

### DASH-02: Recent Leads (Last 20)
- `fetchBrokerRecentLeads()` returns last 20 leads by assigned_at descending
- RecentLeadsCard renders a table with name, vertical, credit score, and delivery timestamp

### DASH-03: Spend Summary
- `fetchBrokerSpendSummary()` calculates spend from lead_prices with broker override fallback
- Three metrics: all-time spent, this month, active order value
- Graceful zero fallback when no prices are configured
- SpendSummaryCard with dollar icons and tabular-nums formatting

### DASH-04: Delivery Health
- `fetchBrokerDeliveryHealth()` groups deliveries by channel, counts sent/failed/pending
- Color-coded success rate bars (green/amber/red)
- Overall success rate badge in card header
- Shows per-channel breakdown with sent/failed/pending counts

## Task Commits

1. **All tasks** - `5ce747a` (feat)

## Files Created/Modified
- `src/lib/portal/queries.ts` - Added 4 dashboard query functions + helper types
- `src/components/portal/dashboard-cards.tsx` - 4 card components (ActiveOrders, RecentLeads, SpendSummary, DeliveryHealth)
- `src/app/portal/(protected)/page.tsx` - Replaced placeholder with full dashboard, all data fetched in parallel

## Deviations from Plan
None

## Issues Encountered
None

---
*Phase: 26-portal-dashboard*
*Completed: 2026-03-17*
