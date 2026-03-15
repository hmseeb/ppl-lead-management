---
created: 2026-03-15T19:20:33.464Z
title: Add assigned column to orders table
area: ui
files:
  - src/components/orders/orders-table.tsx
  - src/lib/queries/orders.ts
---

## Problem

The Orders list page is missing an "Assigned" column. Need to clarify with user what "assigned" means in this context:
- Leads matched to the order but not yet delivered (in-flight)
- Total count of leads with `assigned_order_id` matching the order

Currently the table shows Total, Delivered, and Remaining. An "Assigned" count would likely require querying the leads table for `COUNT(*) WHERE assigned_order_id = order.id`, since there's no `leads_assigned` column on the orders table itself.

## Solution

1. Clarify the meaning of "assigned" (likely leads with `assigned_order_id` matching the order, regardless of delivery status)
2. Either add a subquery/join in `fetchOrdersWithBroker` to count assigned leads per order, or add a denormalized `leads_assigned` column to the orders table
3. Add the column to `OrdersTable` component between Delivered and Remaining (or after Broker)
