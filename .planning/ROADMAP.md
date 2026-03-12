# Roadmap: PPL Lead Management

## Overview

This roadmap delivers an internal lead distribution system in 5 phases following a strict dependency chain: database schema and assignment engine first (the loadbearing wall), then inbound webhook surface, then outbound delivery pipeline, then the admin dashboard that visualizes everything, and finally realtime updates and polish. Each phase produces a verifiable, working layer that the next phase builds on. The assignment engine ships before any webhook code exists because you can't build the caller before the callee.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation + Assignment Engine** - Schema, auth, broker/order CRUD, and the atomic assignment function with advisory locks
- [x] **Phase 2: Webhook Ingestion** - Inbound lead endpoint and PATCH update endpoint wired to the assignment engine
- [x] **Phase 3: Lead Delivery** - Outbound webhook to broker GHL sub-accounts with pg_cron retry pipeline
- [ ] **Phase 4: Admin Dashboard** - Full admin UI with KPIs, all data tables, unassigned queue, and activity log
- [ ] **Phase 5: Realtime + Polish** - Live dashboard updates via Supabase Realtime, theme toggle, UX refinements

## Phase Details

### Phase 1: Foundation + Assignment Engine
**Goal**: The database, auth, broker/order management, and atomic lead assignment logic all exist and work correctly, so that leads can be matched and assigned to brokers programmatically with zero race conditions
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, BRKR-01, BRKR-02, BRKR-03, ORDR-01, ORDR-02, ORDR-03, ORDR-04, ORDR-05, ORDR-06, ASGN-01, ASGN-02, ASGN-03, ASGN-04, ASGN-05, ASGN-06, ASGN-07
**Success Criteria** (what must be TRUE):
  1. Admin can log in with password, access the app, and be redirected to login if session expires
  2. Admin can create, edit, and change status of broker profiles through the UI
  3. Admin can create orders with vertical/credit-score criteria and control their lifecycle (start, pause, resume, complete, bonus toggle)
  4. Calling `assign_lead()` with a test lead correctly matches it to the right broker based on vertical + credit score, uses weighted rotation, decrements leads_remaining, logs the decision, and holds unmatched leads with failure reasons
  5. Two concurrent `assign_lead()` calls never double-assign or produce rotation drift (advisory lock works)
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold, database schema, Supabase clients, and auth (iron-session + middleware)
- [x] 01-02-PLAN.md — Broker and order management UI with CRUD, lifecycle actions, and data tables
- [x] 01-03-PLAN.md — assign_lead() Postgres function with advisory locks, weighted rotation, and test suite

### Phase 2: Webhook Ingestion
**Goal**: External systems (GHL) can send leads into the system via HTTP and the full assignment flow triggers automatically
**Depends on**: Phase 1
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05
**Success Criteria** (what must be TRUE):
  1. POSTing a valid GHL payload to /api/leads/incoming stores the lead, triggers assignment, and returns 200 within 2 seconds
  2. POSTing a duplicate ghl_contact_id does not create a second lead (idempotency enforced)
  3. PATCHing a lead by ghl_contact_id updates it with AI call notes without disrupting assignment
  4. Malformed or incomplete payloads return appropriate error status without crashing the endpoint
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — POST /api/leads/incoming with Zod validation, idempotency on ghl_contact_id, and assignment trigger
- [x] 02-02-PLAN.md — PATCH /api/leads/update for AI call notes by ghl_contact_id without disrupting assignment

### Phase 3: Lead Delivery
**Goal**: Assigned leads are automatically delivered to the correct broker's GHL sub-account via outbound webhook, with retries for failures and clear status tracking
**Depends on**: Phase 2
**Requirements**: DLVR-01, DLVR-02, DLVR-03, DLVR-04
**Success Criteria** (what must be TRUE):
  1. When a lead is assigned, an outbound POST fires to the broker's GHL webhook URL with full lead payload within seconds
  2. Failed deliveries are retried up to 3 times via pg_cron without blocking the inbound handler
  3. Permanently failed deliveries (3 strikes) are flagged with error details visible in the system
  4. Every lead has a trackable delivery status (pending/sent/failed/retrying) with retry count and timestamps
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — webhook_deliveries table, pg_net outbound trigger, and updated assign_lead() with delivery wiring
- [x] 03-02-PLAN.md — pg_cron retry pipeline (response checker + retry scanner) and end-to-end test script

### Phase 4: Admin Dashboard
**Goal**: Admin has full visibility into every lead, broker, order, and event in the system through a professional desktop UI with filtering, search, and inline actions
**Depends on**: Phase 3
**Requirements**: BRKR-04, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10, DASH-11, DASH-12, DASH-13, DASH-14, DASH-15, DASH-16, DASH-17, UX-02
**Success Criteria** (what must be TRUE):
  1. Overview page displays live KPIs (leads today/week/month, assigned vs unassigned, active brokers, active orders) and a recent activity feed
  2. Leads table shows all lead data with working filters (date, vertical, credit score, status, broker) and search (name, phone, email), and clicking a lead shows full detail including AI call notes and delivery status
  3. Brokers table shows all brokers with status and stats, broker detail view shows profile plus all orders and full lead delivery history, and quick actions (pause all, resume all, new order) work
  4. Orders table shows all orders with color-coded status (green/yellow/blue/gray), inline action buttons (pause/resume/bonus/complete) work, and order detail shows every assigned lead
  5. Unassigned queue shows leads with match failure reasons and admin can manually assign any lead to a broker via dropdown
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Realtime + Polish
**Goal**: The dashboard updates live as leads flow through the system without manual refresh, and the UI feels polished and complete
**Depends on**: Phase 4
**Requirements**: RT-01, RT-02, UX-01
**Success Criteria** (what must be TRUE):
  1. When a lead arrives or gets assigned, the dashboard KPIs, activity feed, and relevant tables update within seconds without page refresh
  2. Webhook delivery status changes (sent/failed/retrying) appear live on the leads detail view
  3. Admin can toggle between dark and light themes and the preference persists across sessions
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Assignment Engine | 3/3 | Complete    | 2026-03-12 |
| 2. Webhook Ingestion | 2/2 | Complete    | 2026-03-12 |
| 3. Lead Delivery | 2/2 | Complete    | 2026-03-12 |
| 4. Admin Dashboard | 0/3 | Not started | - |
| 5. Realtime + Polish | 0/2 | Not started | - |
