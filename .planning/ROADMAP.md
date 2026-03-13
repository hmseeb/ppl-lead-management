# Roadmap: PPL Lead Management

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-03-12)
- ✅ **v1.1 Monitoring & Alerting** - Phases 6-9 (shipped 2026-03-13)
- 🚧 **v1.2 Broker Hours Enforcement** - Phases 10-12 (in progress)

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

### 🚧 v1.2 Broker Hours Enforcement

**Milestone Goal:** Respect broker contact hours during lead delivery. Leads assigned instantly but delivery queued until the broker is within their contact window.

- [x] **Phase 10: Hours-Aware Delivery** - Timezone-aware contact hours check that queues out-of-window deliveries instead of firing
- [ ] **Phase 11: Queue Processing** - pg_cron job to release queued deliveries in FIFO order when broker windows open
- [ ] **Phase 12: Admin Visibility** - Dashboard queued count, broker detail hours info, and activity log entries for queue/release events

## Phase Details

### Phase 10: Hours-Aware Delivery
**Goal**: Deliveries respect each broker's contact hours and timezone, queuing instead of firing when outside their window
**Depends on**: Phase 9 (existing delivery infrastructure)
**Requirements**: HOUR-01, HOUR-02, HOUR-03, TZ-01, TZ-02
**Success Criteria** (what must be TRUE):
  1. A lead delivered to a broker with contact_hours = "business_hours" between 9-5 in their timezone fires immediately
  2. A lead delivered to a broker with contact_hours = "business_hours" outside 9-5 in their timezone gets status "queued" instead of firing
  3. A lead delivered to a broker with weekend_pause enabled on Saturday or Sunday gets status "queued"
  4. A lead delivered to a broker with contact_hours = "anytime" always fires immediately regardless of day/time
  5. All hours checks use the broker's own timezone (AT TIME ZONE), not server time
**Plans**: 1 plan

Plans:
- [x] 10-01-PLAN.md — Hours-aware delivery migration + updated assign_lead with is_within_contact_hours helper

### Phase 11: Queue Processing
**Goal**: Queued deliveries are automatically released when the broker's contact window opens
**Depends on**: Phase 10
**Requirements**: HOUR-04, HOUR-05
**Success Criteria** (what must be TRUE):
  1. A pg_cron job runs every 5 minutes and picks up deliveries with status "queued"
  2. Queued deliveries are only released when the broker is currently within their contact window (hours + not weekend-paused)
  3. When multiple deliveries are queued for one broker, they release in FIFO order (oldest created_at first)
  4. Released deliveries proceed through the normal delivery pipeline (pending, sent/failed, retry)
**Plans**: TBD

Plans:
- [ ] 11-01: TBD

### Phase 12: Admin Visibility
**Goal**: Admin can see queued deliveries, broker hours settings, and queue/release activity at a glance
**Depends on**: Phase 11
**Requirements**: VIS-01, VIS-02, VIS-03
**Success Criteria** (what must be TRUE):
  1. Admin dashboard shows a count of currently queued deliveries (waiting for broker hours)
  2. Broker detail page displays the broker's contact hours setting, timezone, weekend pause status, and any queued deliveries for that broker
  3. Activity log records entries when a delivery is queued (with reason) and when a queued delivery is released
**Plans**: TBD

Plans:
- [ ] 12-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 10 -> 11 -> 12

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
| 10. Hours-Aware Delivery | v1.2 | Complete    | 2026-03-13 | 2026-03-13 |
| 11. Queue Processing | v1.2 | 0/? | Not started | - |
| 12. Admin Visibility | v1.2 | 0/? | Not started | - |
