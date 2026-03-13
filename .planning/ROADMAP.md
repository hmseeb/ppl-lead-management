# Roadmap: PPL Lead Management

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-03-12)
- ✅ **v1.1 Monitoring & Alerting** - Phases 6-9 (shipped 2026-03-13)
- ✅ **v1.2 Broker Hours Enforcement** - Phases 10-12 (shipped 2026-03-13)
- ✅ **v2.0 Smart Scoring Engine** - Phases 13-17 (shipped 2026-03-13)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-03-12</summary>

- [x] **Phase 1: Foundation + Assignment Engine** - Schema, auth, broker/order CRUD, and the atomic assignment function with advisory locks
- [x] **Phase 2: Webhook Ingestion** - Inbound lead endpoint and PATCH update endpoint wired to the assignment engine
- [x] **Phase 3: Lead Delivery** - Outbound webhook to broker GHL sub-accounts with pg_cron retry pipeline
- [x] **Phase 4: Admin Dashboard** - Full admin UI with KPIs, all data tables, unassigned queue, and activity log
- [x] **Phase 5: Realtime + Polish** - Live dashboard updates via Supabase Realtime, theme toggle, UX refinements

</details>

<details>
<summary>✅ v1.1 Monitoring & Alerting (Phases 6-9) - SHIPPED 2026-03-13</summary>

- [x] **Phase 6: Alert Foundation** - Reusable send-alert edge function, admin config with Vault, and deduplication infrastructure
- [x] **Phase 7: Real-time Alerts** - DB triggers that fire SMS alerts on delivery failures and unassigned leads
- [x] **Phase 8: Delivery Stats Dashboard** - Today's delivery metrics with channel breakdown and health indicators on the admin dashboard
- [x] **Phase 9: Daily Digest** - Scheduled morning summary via pg_cron with email and SMS delivered through GHL

</details>

<details>
<summary>✅ v1.2 Broker Hours Enforcement (Phases 10-12) - SHIPPED 2026-03-13</summary>

- [x] **Phase 10: Hours-Aware Delivery** - Timezone-aware contact hours check that queues out-of-window deliveries instead of firing
- [x] **Phase 11: Queue Processing** - pg_cron job to release queued deliveries in FIFO order when broker windows open
- [x] **Phase 12: Admin Visibility** - Dashboard queued count, broker detail hours info, and activity log entries for queue/release events

</details>

### 🚧 v2.0 Smart Scoring Engine

**Milestone Goal:** Replace weighted rotation with a scoring-based assignment engine. Each lead is scored against all eligible orders using credit fit, capacity, tier match, loan fit, and priority bonuses. Includes pre-flight rejection, lead dedup, routing audit trail, and monthly recurring orders.

- [ ] **Phase 13: Order Model Expansion** - Add loan range, priority, and order type fields to orders with updated admin form
- [ ] **Phase 14: Pre-flight Validation** - Reject bad leads before scoring and deduplicate on email + phone
- [ ] **Phase 15: Scoring Engine + Tier Gating** - Replace ORDER BY with 0-100 scoring algorithm, hard credit tier filters, and loan range exclusion
- [x] **Phase 16: Routing Audit Trail** - Per-lead routing logs with score breakdowns viewable on lead detail page
- [x] **Phase 17: Monthly Recurring Orders** - Auto-reset leads_delivered on the 1st for monthly orders with audit logging

## Phase Details

### Phase 13: Order Model Expansion
**Goal**: Orders support loan amount ranges, priority levels, and monthly recurring type so the scoring engine has the data it needs
**Depends on**: Phase 12 (existing order infrastructure)
**Requirements**: ORDER-01, ORDER-02, ORDER-04
**Success Criteria** (what must be TRUE):
  1. Admin can set loan_min and loan_max on an order, and the values persist after save
  2. Admin can set order priority to "high" or "normal" (default normal), visible on order list
  3. Admin can create a "monthly" order type in addition to "one-time", visible on order list and detail
  4. Order creation/edit form includes all three new fields (loan range, priority, order type)
**Plans:** 2 plans
Plans:
- [x] 13-01-PLAN.md -- DB migration, type regen, Zod schema, and server action for new order fields
- [x] 13-02-PLAN.md -- Order form, table, and detail UI updates for new fields

### Phase 14: Pre-flight Validation
**Goal**: Leads that can never be routed are rejected immediately with a clear reason, and duplicate leads are caught before assignment
**Depends on**: Phase 13 (order model must have loan fields for future scoring, but pre-flight itself only needs credit check and active order check)
**Requirements**: VALID-01, VALID-02, VALID-03, VALID-04
**Success Criteria** (what must be TRUE):
  1. A lead with credit_score < 600 is immediately rejected with status "rejected" and reason "credit_too_low" (never enters scoring)
  2. A lead with missing or invalid loan_amount (<= 0) is immediately rejected with reason "invalid_loan_amount"
  3. A lead arriving when zero active orders exist is rejected with reason "no_active_orders"
  4. A lead with the same email + phone combination as an existing lead is flagged as duplicate and returns the existing lead (not re-routed)
  5. Rejected leads appear in the admin dashboard with their rejection reason
**Plans:** 2 plans
Plans:
- [x] 14-01-PLAN.md -- DB migration + pre-flight validation logic in webhook route
- [x] 14-02-PLAN.md -- Dashboard UI updates for rejected leads display

### Phase 15: Scoring Engine + Tier Gating
**Goal**: Leads are assigned to the highest-scoring eligible order using a 0-100 point algorithm that replaces the current weighted rotation ORDER BY clause
**Depends on**: Phase 14 (pre-flight must run before scoring)
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-07, SCORE-08, TIER-01, TIER-02, TIER-03, ORDER-05
**Success Criteria** (what must be TRUE):
  1. A lead with credit_score 720 routes to a 680-min order (20pts tier match) over a 600-min order (10pts) when both have similar capacity
  2. A lead with credit_score 650 never routes to a 680-min order (hard filter enforced regardless of scores)
  3. An order at 20% fill rate wins over an identical order at 80% fill rate (capacity scoring works)
  4. A "high" priority order gets +8pts and wins over an otherwise equal "normal" order
  5. A lead with funding_amount outside an order's loan_min/loan_max range is excluded from that order (hard filter)
**Plans:** 2 plans
Plans:
- [x] 15-01-PLAN.md -- TDD scoring engine: pure TypeScript scoring function with unit tests for all 12 requirements
- [x] 15-02-PLAN.md -- Wire scoring into assignment flow: refactor SQL + TypeScript to use scoring engine

### Phase 16: Routing Audit Trail
**Goal**: Every routing decision is fully auditable with per-order score breakdowns visible to the admin
**Depends on**: Phase 15 (scoring engine must exist to produce score data)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03
**Success Criteria** (what must be TRUE):
  1. Every lead assignment produces a routing_logs row for EVERY order considered (not just the winner), including eligible/disqualified status and score breakdown
  2. Lead status enum includes "rejected" and rejected leads display their reason in the leads table
  3. Admin can click a lead and see the full scoring breakdown: every order considered, their individual component scores (credit_fit, capacity, tier_match, loan_fit, bonuses), and why disqualified orders were excluded
**Plans:** 2 plans
Plans:
- [x] 16-01-PLAN.md -- DB migration for routing_logs table + scoreLeadFull() + assignment wiring
- [x] 16-02-PLAN.md -- Routing audit UI on lead detail page with score breakdown table

### Phase 17: Monthly Recurring Orders
**Goal**: Monthly orders automatically reset their delivered count on the 1st so brokers get fresh lead allocation each month without manual intervention
**Depends on**: Phase 15 (scoring engine uses leads_delivered for capacity calc, reset must be compatible)
**Requirements**: ORDER-03, AUDIT-04
**Success Criteria** (what must be TRUE):
  1. On the 1st of the month, orders with type "monthly" have their leads_delivered reset to 0 and leads_remaining restored to total_leads
  2. The reset is logged in activity_log with the order_id, reset timestamp, and previous delivered count
  3. Monthly orders that were "completed" (leads_remaining hit 0) are reactivated to "active" status on reset
  4. One-time orders are never affected by the monthly reset
**Plans:** 1 plan
Plans:
- [x] 17-01-PLAN.md -- Monthly reset SQL function + pg_cron schedule + activity log UI update

## Progress

**Execution Order:**
Phases execute in numeric order: 13 -> 14 -> 15 -> 16 -> 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation + Assignment Engine | v1.0 | 3/3 | Complete | 2026-03-12 |
| 2. Webhook Ingestion | v1.0 | 2/2 | Complete | 2026-03-12 |
| 3. Lead Delivery | v1.0 | 2/2 | Complete | 2026-03-12 |
| 4. Admin Dashboard | v1.0 | 4/4 | Complete | 2026-03-12 |
| 5. Realtime + Polish | v1.0 | 2/2 | Complete | 2026-03-12 |
| 6. Alert Foundation | v1.1 | 2/2 | Complete | 2026-03-13 |
| 7. Real-time Alerts | v1.1 | 1/1 | Complete | 2026-03-13 |
| 8. Delivery Stats Dashboard | v1.1 | 2/2 | Complete | 2026-03-13 |
| 9. Daily Digest | v1.1 | 1/1 | Complete | 2026-03-13 |
| 10. Hours-Aware Delivery | v1.2 | 1/1 | Complete | 2026-03-13 |
| 11. Queue Processing | v1.2 | 1/1 | Complete | 2026-03-13 |
| 12. Admin Visibility | v1.2 | 2/2 | Complete | 2026-03-13 |
| 13. Order Model Expansion | v2.0 | 2/2 | Complete | 2026-03-13 |
| 14. Pre-flight Validation | v2.0 | 2/2 | Complete | 2026-03-13 |
| 15. Scoring Engine + Tier Gating | v2.0 | 2/2 | Complete | 2026-03-13 |
| 16. Routing Audit Trail | v2.0 | 2/2 | Complete | 2026-03-13 |
| 17. Monthly Recurring Orders | v2.0 | 1/1 | Complete | 2026-03-13 |
