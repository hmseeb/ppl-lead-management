---
created: 2026-03-13T16:28:11.738Z
title: Wire up broker verticals in assignment engine
area: api
files:
  - supabase/migrations/00018_queue_activity_logging.sql
  - src/lib/types/database.ts:152-153
---

## Problem

Brokers have `primary_vertical` and `secondary_vertical` columns (populated during onboarding) but the `assign_lead()` function completely ignores them. Matching is done solely against `orders.verticals`.

This means:
- No prioritization when a lead's vertical matches a broker's primary vs secondary vertical
- If a lead comes in with no vertical (now optional), there's no fallback to broker-level vertical affinity
- The broker profile data from onboarding has zero influence on assignment weighting

## Solution

Options to consider:
1. **Weighted prioritization** — when multiple orders match, boost weight for orders whose broker's `primary_vertical` matches the lead's vertical (e.g. 1.5x multiplier), lesser boost for `secondary_vertical` match (e.g. 1.2x)
2. **Fallback matching** — if lead has no vertical, use broker's accepted verticals from their profile as a softer signal
3. **Keep as-is** — order-level verticals are the intentional control surface, broker verticals are just informational from onboarding

Need to decide which approach before implementing.
