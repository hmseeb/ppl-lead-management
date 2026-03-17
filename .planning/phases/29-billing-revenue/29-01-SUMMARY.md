---
phase: 29-billing-revenue
plan: 01
subsystem: portal, admin-dashboard
tags: [billing, revenue, stripe, receipts, broker-portal, admin]

requires:
  - phase: 25-order-creation-payment
    provides: stripe columns on orders
  - phase: 26-portal-dashboard
    provides: portal layout, broker-scoped queries
  - phase: 22-broker-auth
    provides: broker session, guard

provides:
  - broker billing page with order history and receipt links
  - admin revenue summary (total, by broker, by vertical)
  - billing link in portal navigation

affects: [portal-header, portal-queries, admin-dashboard, dashboard-queries]

key-files:
  created:
    - src/components/portal/billing-table.tsx
    - src/app/portal/(protected)/billing/page.tsx
    - src/lib/actions/billing.ts
    - src/components/admin/revenue-summary.tsx
    - .planning/phases/29-billing-revenue/29-01-PLAN.md
  modified:
    - src/lib/portal/queries.ts
    - src/components/portal/portal-header.tsx
    - src/lib/queries/dashboard.ts
    - src/app/(dashboard)/page.tsx

key-decisions:
  - "Receipt URLs fetched on-demand from Stripe API, not stored in DB"
  - "Server action getReceiptUrl validates broker ownership before Stripe call"
  - "Tries payment_intent first (1 API call), falls back to checkout session"
  - "Revenue summary uses total_price_cents from orders, excludes pending_payment"
  - "Revenue by vertical uses first vertical in order's verticals array"
  - "Admin revenue component is server-rendered, no client JS"

requirements-completed: [BILL-01, BILL-02, BILL-03]

duration: 8min
completed: 2026-03-17
---

# Plan 29-01: Billing + Revenue Summary

**Brokers can review payment history with Stripe receipts, admin sees revenue analytics**

## Performance

- **Duration:** 8 min
- **Tasks:** 4
- **Files created:** 4
- **Files modified:** 4

## Accomplishments

### BILL-01: Broker Order History
- `fetchBrokerBillingOrders(brokerId)` in portal queries returns all orders with pricing/Stripe columns
- BillingTable component shows date, vertical, leads delivered/total, amount, status
- Status badges color-coded (green=active, blue=completed, amber=paused, gray=pending)
- Total spent shown in card header badge (excludes pending_payment orders)

### BILL-02: Stripe Receipt Links
- `getReceiptUrl(orderId)` server action in `src/lib/actions/billing.ts`
- Validates broker session owns the order via `assertBrokerOwnsOrder`
- Retrieves receipt URL: payment_intent -> latest_charge -> receipt_url
- Falls back to checkout session -> payment_intent -> latest_charge if needed
- ReceiptButton client component opens receipt in new tab with loading state

### BILL-03: Admin Revenue Summary
- `fetchRevenueSummary()` in `src/lib/queries/dashboard.ts`
- Aggregates total_price_cents from all paid orders
- Groups revenue by broker (with names via join) and by vertical
- `RevenueSummarySection` component with total card + two side-by-side breakdowns
- Progress bars show percentage share per broker/vertical
- Added to admin dashboard below activity feed and chart

### Portal Navigation
- Added "Billing" link with Receipt icon to portal header nav
- Routes to `/portal/billing`

## Files Created/Modified
- `src/lib/portal/queries.ts` - Added BillingOrder type + fetchBrokerBillingOrders
- `src/lib/actions/billing.ts` - getReceiptUrl server action
- `src/components/portal/billing-table.tsx` - BillingTable + ReceiptButton components
- `src/app/portal/(protected)/billing/page.tsx` - Billing page
- `src/components/portal/portal-header.tsx` - Added Billing nav item
- `src/lib/queries/dashboard.ts` - Added RevenueSummary type + fetchRevenueSummary
- `src/components/admin/revenue-summary.tsx` - RevenueSummarySection component
- `src/app/(dashboard)/page.tsx` - Added revenue section to admin dashboard

## Deviations from Plan
None

## Issues Encountered
None

---
*Phase: 29-billing-revenue*
*Completed: 2026-03-17*
