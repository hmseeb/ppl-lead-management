# Roadmap: PPL Lead Management

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-12)
- ✅ **v1.1 Monitoring & Alerting** — Phases 6-9 (shipped 2026-03-13)
- ✅ **v1.2 Broker Hours Enforcement** — Phases 10-12 (shipped 2026-03-13)
- ✅ **v2.0 Smart Scoring Engine** — Phases 13-17 (shipped 2026-03-17)
- 🚧 **v2.1 Dashboard Analytics** — Phases 18-21 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-03-12</summary>

- [x] Phase 1: Foundation + Assignment Engine (3/3 plans)
- [x] Phase 2: Webhook Ingestion (2/2 plans)
- [x] Phase 3: Lead Delivery (2/2 plans)
- [x] Phase 4: Admin Dashboard (4/4 plans)
- [x] Phase 5: Realtime + Polish (2/2 plans)

</details>

<details>
<summary>✅ v1.1 Monitoring & Alerting (Phases 6-9) — SHIPPED 2026-03-13</summary>

- [x] Phase 6: Alert Foundation (2/2 plans)
- [x] Phase 7: Real-time Alerts (1/1 plan)
- [x] Phase 8: Delivery Stats Dashboard (2/2 plans)
- [x] Phase 9: Daily Digest (1/1 plan)

</details>

<details>
<summary>✅ v1.2 Broker Hours Enforcement (Phases 10-12) — SHIPPED 2026-03-13</summary>

- [x] Phase 10: Hours-Aware Delivery (1/1 plan)
- [x] Phase 11: Queue Processing (1/1 plan)
- [x] Phase 12: Admin Visibility (2/2 plans)

</details>

<details>
<summary>✅ v2.0 Smart Scoring Engine (Phases 13-17) — SHIPPED 2026-03-17</summary>

- [x] Phase 13: Order Model Expansion (2/2 plans)
- [x] Phase 14: Pre-flight Validation (2/2 plans)
- [x] Phase 15: Scoring Engine + Tier Gating (2/2 plans)
- [x] Phase 16: Routing Audit Trail (2/2 plans)
- [x] Phase 17: Monthly Recurring Orders (1/1 plan)

</details>

### v2.1 Dashboard Analytics (In Progress)

**Milestone Goal:** Add date range, broker, and vertical filters to the KPI dashboard with comparison mode, adaptive charts, and auto-reassignment of unassigned leads on order changes.

- [x] **Phase 18: Dashboard Filters** - Date range, broker, and vertical filters wired into all dashboard queries with URL persistence (completed 2026-03-17)
- [x] **Phase 19: Comparison Mode** - Delta badges showing current vs previous period on KPI cards (completed 2026-03-17)
- [ ] **Phase 20: Chart Adaptation** - Lead volume chart responds to selected date filter with smart bucketing
- [ ] **Phase 21: Auto-Reassignment** - Unassigned leads automatically re-routed when matching orders activate

## Phase Details

### Phase 18: Dashboard Filters
**Goal**: Admin can scope the entire dashboard to any date range, broker, or vertical and share that view via URL
**Depends on**: Phase 17 (v2.0 complete)
**Requirements**: FILT-01, FILT-02, FILT-03, FILT-04, FILT-05, FILT-06
**Success Criteria** (what must be TRUE):
  1. Admin selects a date preset (today, 7d, 30d, 90d) and all KPI cards and delivery stats update to reflect that range
  2. Admin sets a custom date range with date pickers and all dashboard data scopes to those exact dates
  3. Admin selects a broker from the dropdown and all KPIs show only that broker's numbers
  4. Admin selects a vertical from the dropdown and all KPIs show only leads of that vertical
  5. Admin copies the URL, opens it in a new tab, and sees the same filtered dashboard state. Clear all resets to defaults
**Plans**: 2 plans

Plans:
- [ ] 18-01-PLAN.md — DashboardFilters type, component, and query function refactoring
- [ ] 18-02-PLAN.md — Wire page.tsx with searchParams, filters, and KPI card updates

### Phase 19: Comparison Mode
**Goal**: Admin can see at a glance whether metrics are improving or declining compared to the previous equivalent period
**Depends on**: Phase 18
**Requirements**: COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. Admin toggles comparison mode on and delta badges appear on each KPI card showing the change vs the previous period
  2. Previous period is calculated automatically (7d filter compares to prior 7d, 30d to prior 30d, etc.)
  3. Delta badges use green for metrics improving (more leads assigned) and red for metrics worsening (more failures), with contextual color logic per metric
**Plans**: 1 plan

Plans:
- [ ] 19-01-PLAN.md — Compare toggle, previous period calculation, and delta badges on KPI cards

### Phase 20: Chart Adaptation
**Goal**: Lead volume chart dynamically adjusts its range and bucket granularity to match the active dashboard filter
**Depends on**: Phase 18
**Requirements**: CHART-01, CHART-02
**Success Criteria** (what must be TRUE):
  1. Admin selects "7d" filter and the lead volume chart shows exactly 7 days of daily bars (not hardcoded "today")
  2. Admin selects "90d" filter and the chart switches to weekly buckets for readability
  3. Admin selects "today" or a custom 1-3 day range and the chart shows daily bars for that range
**Plans**: TBD

Plans:
- [ ] 20-01: TBD

### Phase 21: Auto-Reassignment
**Goal**: Unassigned leads are automatically matched and delivered when a qualifying order becomes available, without admin intervention
**Depends on**: Phase 17 (scoring engine, independent of filter phases)
**Requirements**: REASS-01, REASS-02, REASS-03
**Success Criteria** (what must be TRUE):
  1. Admin activates or unpauses an order and any matching leads in the unassigned queue are automatically scored and assigned
  2. Auto-reassigned leads go through the full scoring engine (same 0-100 scoring, tier gating, pre-flight checks)
  3. Each auto-reassignment appears in the activity log with a clear event type indicating it was an automatic reassignment
**Plans**: TBD

Plans:
- [ ] 21-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 18 → 19 → 20 → 21
(Phase 20 and 21 are independent after 18, but sequential execution keeps things simple)

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-5 | v1.0 MVP | 13/13 | Complete | 2026-03-12 |
| 6-9 | v1.1 Monitoring | 6/6 | Complete | 2026-03-13 |
| 10-12 | v1.2 Hours | 4/4 | Complete | 2026-03-13 |
| 13-17 | v2.0 Scoring | 9/9 | Complete | 2026-03-17 |
| 18. Dashboard Filters | 2/2 | Complete    | 2026-03-17 | - |
| 19. Comparison Mode | 1/1 | Complete   | 2026-03-17 | - |
| 20. Chart Adaptation | v2.1 Analytics | 0/? | Not started | - |
| 21. Auto-Reassignment | v2.1 Analytics | 0/? | Not started | - |

**Total: 21 phases, 33+ plans across 5 milestones**
