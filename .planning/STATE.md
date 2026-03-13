# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail.
**Current focus:** v2.0 Smart Scoring Engine — Phase 13: Order Model Expansion

## Current Position

Phase: 13 of 17 (Order Model Expansion) — COMPLETE
Plan: 2 of 2 in current phase
Status: Phase 13 complete, ready for Phase 14
Last activity: 2026-03-13 — Phase 13 executed (migration + UI)

Progress: [██████████████████████░░░░░░░░] 76% (phases 1-13 complete, 14-17 pending)

## Performance Metrics

**Velocity:**
- Total plans completed: 23 (v1.0: 13, v1.1: 6, v1.2: 4)
- Average duration: 5min
- Total execution time: ~1.5 hours

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

**v2.0 Context:**
- Dan confirmed order-based architecture stays. Spec adapted: orders are the routing unit, not brokers.
- Credit tiers: 600+ for MCA/Term loans, 680+ for term loans and 0% credit stacking
- LEAD_ROUTING_SPEC.md is broker-centric reference. Our implementation uses orders (leads_remaining/leads_delivered on orders, not brokers).
- Current assign_lead() uses advisory locks + ORDER BY weighted rotation. Scoring replaces the ORDER BY clause.
- fill_rate = leads_delivered / total_leads (on orders table)
- Existing fields: leads_remaining, leads_delivered, total_leads, credit_score_min, bonus_mode on orders

### Pending Todos

None.

### Blockers/Concerns

- GHL webhook payload schema not formally documented. Raw jsonb stored alongside parsed fields.
- GHL rate limit behavior under real load (100 req/10s) not empirically tested.
- Scoring function complexity: the new assign_lead will be significantly larger. Consider breaking scoring into a helper function.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Implement webhook delivery backend for sending assigned leads to broker CRM | 2026-03-12 | 0055c3e | [1-implement-webhook-delivery-backend-for-s](./quick/1-implement-webhook-delivery-backend-for-s/) |
| 2 | Make KPI cards clickable with inline expandable preview tables | 2026-03-13 | 7ae360a | [2-make-kpi-cards-clickable-with-inline-exp](./quick/2-make-kpi-cards-clickable-with-inline-exp/) |
| 3 | Add search and filters to brokers, orders, unassigned, activity pages | 2026-03-13 | 2b92f68 | [3-add-search-and-filters-to-brokers-orders](./quick/3-add-search-and-filters-to-brokers-orders/) |

## Session Continuity

Last session: 2026-03-13
Stopped at: v2.0 roadmap created, ready to plan Phase 13
Resume file: None
