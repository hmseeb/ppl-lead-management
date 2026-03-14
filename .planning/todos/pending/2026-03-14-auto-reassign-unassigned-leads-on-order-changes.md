---
created: 2026-03-14T19:26:21.361Z
title: Auto-reassign unassigned leads on order changes
area: api
type: feature
files:
  - src/lib/routing/ (scoring engine)
  - unassigned_queue table
---

## Problem

Unassigned leads sit idle in the `unassigned_queue` until someone manually assigns them from the UI. When a new order is created, or an existing order's criteria change (verticals, credit_score_min, loan range), there's no automatic check to see if any queued leads now match. This means leads that arrived before a matching order existed will never get routed unless a human notices them.

High-value gap: brokers creating new orders expect to immediately start receiving matching leads, but the system only routes leads at ingestion time.

## Solution

When an order is created or its routing-relevant fields are updated (verticals, credit_score_min, loan_amount_min/max):

1. Query `unassigned_queue` for leads matching the new/updated order criteria
2. Run matched leads through the existing scoring engine against all eligible orders (not just the new one)
3. Assign leads that score above threshold, remove them from the queue
4. Log routing audit trail entries for transparency

Trigger points:
- `INSERT` on orders table (new order created)
- `UPDATE` on orders where verticals, credit_score_min, or loan range columns change

Consider a Supabase database trigger or a post-save hook in the order creation/update API route.
