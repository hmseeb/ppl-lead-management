# Requirements: PPL Lead Management

**Defined:** 2026-03-17
**Core Value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail of why each assignment was made.

## v2.1 Requirements

Requirements for Dashboard Analytics milestone. Each maps to roadmap phases.

### Dashboard Filters

- [x] **FILT-01**: Admin can select date range preset (today, 7d, 30d, 90d) to scope all KPI cards and delivery stats
- [x] **FILT-02**: Admin can set custom date range (date_from, date_to) to scope all KPI cards and delivery stats
- [x] **FILT-03**: Admin can filter dashboard KPIs by broker (single-select dropdown)
- [x] **FILT-04**: Admin can filter dashboard KPIs by vertical (single-select dropdown)
- [x] **FILT-05**: All filter selections persist in URL via nuqs (shareable, bookmarkable)
- [x] **FILT-06**: Clear all button resets all filters to defaults (today, no broker, no vertical)

### Comparison Mode

- [x] **COMP-01**: Admin can toggle comparison mode to show delta badges on each KPI card
- [x] **COMP-02**: Delta calculates current period vs equivalent previous period automatically (e.g. 7d vs prior 7d)
- [x] **COMP-03**: Delta badges are color-coded contextually (green for good metrics improving, red for bad metrics worsening)

### Chart Adaptation

- [x] **CHART-01**: Lead volume chart adapts its date range to match the selected dashboard filter
- [x] **CHART-02**: Lead volume chart uses weekly buckets for 90d range instead of daily bars

### Auto-Reassignment

- [x] **REASS-01**: When an order is activated or unpaused, system checks unassigned queue for matching leads
- [x] **REASS-02**: Matching unassigned leads are automatically routed through the scoring engine
- [x] **REASS-03**: Auto-reassignment is logged in activity_log with event type and details

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-broker filter (select multiple brokers) | Single-select is sufficient for broker scorecard use case |
| Exportable reports (CSV/PDF) | Defer until reporting needs emerge |
| Saved filter presets / bookmarks | URL persistence covers this via browser bookmarks |
| Dashboard customization (rearrange cards) | Over-engineering for single admin user |
| Real-time filter updates via Supabase Realtime | Server-side refetch on filter change is fast enough |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FILT-01 | Phase 18 | Complete |
| FILT-02 | Phase 18 | Complete |
| FILT-03 | Phase 18 | Complete |
| FILT-04 | Phase 18 | Complete |
| FILT-05 | Phase 18 | Complete |
| FILT-06 | Phase 18 | Complete |
| COMP-01 | Phase 19 | Complete |
| COMP-02 | Phase 19 | Complete |
| COMP-03 | Phase 19 | Complete |
| CHART-01 | Phase 20 | Complete |
| CHART-02 | Phase 20 | Complete |
| REASS-01 | Phase 21 | Complete |
| REASS-02 | Phase 21 | Complete |
| REASS-03 | Phase 21 | Complete |

**Coverage:**
- v2.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after roadmap creation*
