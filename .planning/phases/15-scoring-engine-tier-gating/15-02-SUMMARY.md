---
phase: 15-scoring-engine-tier-gating
plan: 02
type: summary
status: complete
started: 2026-03-13
completed: 2026-03-13
---

## What was done

### Task 1: SQL migration
- Created `00021_scoring_assign_lead.sql`: `assign_lead()` now accepts optional `p_order_id`
- When p_order_id provided: skips ORDER BY, fetches order directly, validates capacity (race condition guard)
- When NULL: falls back to old weighted rotation
- Delivery creation flow unchanged
- Types regenerated showing both function overloads

### Task 2: TypeScript assignLead refactor
- `assignLead()` now: fetches lead + orders -> calls `scoreLead()` -> passes winner to SQL
- Orders fetched with joined broker `assignment_status` for scoring
- If no scored orders, SQL handles unassigned path with `build_match_failure_reason()`
- Return shape unchanged, webhook route needs no modifications

## Artifacts
- `supabase/migrations/00021_scoring_assign_lead.sql`
- `src/lib/types/database.ts` — regenerated
- `src/lib/assignment/assign.ts` — scoring-based assignment
