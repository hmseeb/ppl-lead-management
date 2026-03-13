# Roadmap: PPL Lead Management

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-03-12)
- 🚧 **v1.1 Monitoring & Alerting** - Phases 6-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-03-12</summary>

- [x] **Phase 1: Foundation + Assignment Engine** - Schema, auth, broker/order CRUD, and the atomic assignment function with advisory locks
- [x] **Phase 2: Webhook Ingestion** - Inbound lead endpoint and PATCH update endpoint wired to the assignment engine
- [x] **Phase 3: Lead Delivery** - Outbound webhook to broker GHL sub-accounts with pg_cron retry pipeline
- [x] **Phase 4: Admin Dashboard** - Full admin UI with KPIs, all data tables, unassigned queue, and activity log
- [x] **Phase 5: Realtime + Polish** - Live dashboard updates via Supabase Realtime, theme toggle, UX refinements

</details>

### v1.1 Monitoring & Alerting

**Phase Numbering:**
- Integer phases (6, 7, 8, 9): Planned milestone work
- Decimal phases (6.1, 7.1): Urgent insertions (marked with INSERTED)

- [ ] **Phase 6: Alert Foundation** - Reusable send-alert edge function, admin config with Vault, and deduplication infrastructure
- [ ] **Phase 7: Real-time Alerts** - DB triggers that fire SMS alerts on delivery failures and unassigned leads
- [ ] **Phase 8: Delivery Stats Dashboard** - Today's delivery metrics with channel breakdown and health indicators on the admin dashboard
- [ ] **Phase 9: Daily Digest** - Scheduled morning summary via pg_cron with email and SMS delivered through GHL

## Phase Details

### Phase 6: Alert Foundation
**Goal**: A tested, reusable alert pipeline exists so that any event in the system can send an SMS to the admin through GHL, with built-in deduplication to prevent alert storms
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: ALRT-01, ALRT-04, ALRT-05
**Success Criteria** (what must be TRUE):
  1. Admin GHL contact ID is stored in Supabase Vault and retrievable by edge functions at runtime
  2. Calling the `send-alert` edge function with a failure-type payload delivers an SMS to the admin via GHL Conversations API
  3. Calling `send-alert` with an unassigned-type payload delivers a differently formatted SMS to the admin
  4. Sending the same alert type for the same broker within 15 minutes results in only one SMS (dedup works)
**Plans:** 2 plans

Plans:
- [ ] 06-01-PLAN.md — admin_settings table, Vault secret, and send-alert edge function with GHL SMS delivery
- [ ] 06-02-PLAN.md — Alert deduplication with alert_state table, 15-minute window, and cleanup cron

### Phase 7: Real-time Alerts
**Goal**: Admin receives an SMS within seconds when a delivery permanently fails or a lead goes unassigned, so problems are caught immediately instead of hours later on the dashboard
**Depends on**: Phase 6
**Requirements**: ALRT-02, ALRT-03
**Success Criteria** (what must be TRUE):
  1. When a delivery status changes to failed_permanent, admin receives an SMS with lead name, broker name, channel, and error details
  2. When a lead enters the unassigned queue, admin receives an SMS with lead details and the match failure reason
  3. Multiple correlated failures (same broker endpoint down) produce throttled alerts, not a flood of SMS messages
**Plans:** 1 plan

Plans:
- [ ] 07-01-PLAN.md — Both alert trigger functions and trigger definitions in a single migration (delivery failures + unassigned leads)

### Phase 8: Delivery Stats Dashboard
**Goal**: Admin can see today's delivery health at a glance on the existing dashboard, with real-time counts and color-coded channel status, without navigating to individual lead or broker pages
**Depends on**: Phase 5 (v1.0 dashboard exists). No dependency on Phases 6-7 (parallel-safe)
**Requirements**: MNTR-01, MNTR-02, MNTR-03, MNTR-04, MNTR-05
**Success Criteria** (what must be TRUE):
  1. Dashboard shows today's lead counts: received, assigned, and unassigned
  2. Dashboard shows today's delivery counts broken down by channel (webhook, email, SMS)
  3. Dashboard shows today's failed delivery count with per-channel breakdown
  4. All delivery stats update in real-time when new leads arrive or delivery statuses change (no manual refresh)
  5. Each delivery channel shows a color-coded health indicator (green/yellow/red) based on recent failure rate
**Plans**: TBD

Plans:
- [ ] 08-01: delivery_stats_today SQL view, fetchDeliveryStats() query, and DeliveryStats UI component with KPI cards
- [ ] 08-02: Channel health indicators with color-coded status and Realtime refresh wiring

### Phase 9: Daily Digest
**Goal**: Admin receives a morning summary every day at 8 AM Pacific with overnight stats via email and SMS through GHL, so nothing slips through the cracks while they're not watching the dashboard
**Depends on**: Phase 6 (Vault config and GHL integration proven)
**Requirements**: DGST-01, DGST-02, DGST-03, DGST-04
**Success Criteria** (what must be TRUE):
  1. A pg_cron job fires at 8 AM Pacific daily (16:00 UTC) and invokes the daily-digest edge function
  2. Admin receives an email with overnight stats: leads received, assigned, unassigned, deliveries by channel, and failures
  3. Admin receives an SMS with a compact summary of the same overnight numbers
  4. Both email and SMS are delivered via GHL Conversations API to the configured admin contact
**Plans**: TBD

Plans:
- [ ] 09-01: daily-digest edge function, pg_cron schedule, HTML email template, and SMS summary format

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9
Note: Phase 8 has no dependency on 6-7 and can execute in parallel if desired.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation + Assignment Engine | v1.0 | 3/3 | Complete | 2026-03-12 |
| 2. Webhook Ingestion | v1.0 | 2/2 | Complete | 2026-03-12 |
| 3. Lead Delivery | v1.0 | 2/2 | Complete | 2026-03-12 |
| 4. Admin Dashboard | v1.0 | 4/4 | Complete | 2026-03-12 |
| 5. Realtime + Polish | v1.0 | 2/2 | Complete | 2026-03-12 |
| 6. Alert Foundation | v1.1 | 0/2 | Not started | - |
| 7. Real-time Alerts | v1.1 | 0/1 | Not started | - |
| 8. Delivery Stats Dashboard | v1.1 | 0/2 | Not started | - |
| 9. Daily Digest | v1.1 | 0/1 | Not started | - |
