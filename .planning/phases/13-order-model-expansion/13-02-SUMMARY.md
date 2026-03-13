---
phase: 13-order-model-expansion
plan: 02
type: summary
status: complete
started: 2026-03-13
completed: 2026-03-13
---

## What was done

### Task 1: Order form new fields
- Added loan amount range (min/max) number inputs in grid layout
- Added priority select (Normal/High) using native HTML select
- Added order type select (One-time/Monthly) using native HTML select
- Updated form defaultValues with loan_min: null, loan_max: null, priority: 'normal', order_type: 'one_time'
- Imported PRIORITIES and ORDER_TYPES from schema

### Task 2: Orders table and detail view
- Added priority, order_type, loan_min, loan_max to OrderWithBroker type and query select
- Added Priority column: shows amber "High" badge or dash for normal
- Added Type column: shows "Monthly" outline badge or "One-time" text
- Order detail shows Loan Range formatted as "$X - $Y", "$X+", "Up to $Y", or "Any"
- Order detail shows Priority with amber styling for high
- Order detail shows Order Type as "Monthly" or "One-time"

## Artifacts
- `src/components/orders/order-form.tsx` — 3 new form fields
- `src/components/orders/orders-table.tsx` — 2 new columns
- `src/components/orders/order-detail.tsx` — 3 new info rows
- `src/lib/queries/orders.ts` — select includes new fields

## Verification
- `bun run build` passes with no errors
