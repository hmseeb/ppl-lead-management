## 16-01 Summary: Routing Logs Table + scoreLeadFull() + Assignment Wiring

**Status:** Complete
**Date:** 2026-03-13

### What was done

1. **Migration 00022_routing_logs.sql** — Created routing_logs table with score_breakdown jsonb, indexes on lead_id/order_id/created_at, RLS policies for anon select/insert.

2. **scoring.ts refactored** — Extracted `scoreAllOrders()` internal helper. Added `scoreLeadFull()` returning `{ eligible, disqualified, all }` for full audit trail.

3. **assign.ts updated** — Uses `scoreLeadFull()` instead of `scoreLead()`. Fire-and-forget insert to routing_logs for every order considered per lead. Winner marked with `selected: true`.

4. **Types regenerated** — database.ts includes routing_logs table definition.

### Artifacts

| File | Change |
|------|--------|
| supabase/migrations/00022_routing_logs.sql | New migration |
| src/lib/assignment/scoring.ts | Added scoreLeadFull(), extracted scoreAllOrders() |
| src/lib/assignment/assign.ts | Routing log persistence, uses scoreLeadFull() |
| src/lib/types/database.ts | Regenerated with routing_logs |

### Requirements covered

- AUDIT-01: Routing logs table records every order considered per lead
- AUDIT-02: Lead status enum already includes 'rejected' (done in Phase 14)
