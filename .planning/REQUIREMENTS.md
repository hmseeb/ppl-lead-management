# Requirements: PPL Lead Management

**Defined:** 2026-03-30
**Core Value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail.

## v5.0 Requirements

Requirements for Broker Portal Analytics milestone. Each maps to roadmap phases.

### Call Reporting

- [x] **CALL-01**: Broker can view total calls, transferred, callbacks booked, no answer, and voicemail counts on a dedicated /portal/calls page
- [x] **CALL-02**: Broker can see percentage of total for each call outcome
- [x] **CALL-03**: Broker can view a stacked bar chart showing call outcome volume over time (daily/weekly bucketing)
- [x] **CALL-04**: Broker can see a list of their upcoming pending callbacks with lead name and scheduled time
- [x] **CALL-05**: Broker can filter call reporting data by date range using pill presets (Today, 7d, 30d, 90d)
- [x] **CALL-06**: Broker can filter call reporting data by custom date range picker

### Dashboard Enrichment

- [x] **DASH-01**: Broker can see a lead volume trend chart on the dashboard showing leads received over time
- [x] **DASH-02**: Broker can see a compact call summary card with total calls, transfer rate, and next upcoming callback
- [x] **DASH-03**: Broker can see their average credit score across all assigned leads
- [x] **DASH-04**: Broker can see a prominent next callback card with lead name and scheduled time when callbacks are pending
- [x] **DASH-05**: Dashboard date range filter affects lead volume trend and call summary cards

### Lead Quality Analytics

- [ ] **QUAL-01**: Broker can see credit score tier distribution (500-599, 600-679, 680+) as a visual histogram
- [ ] **QUAL-02**: Broker can see vertical mix breakdown as a chart showing lead distribution by vertical
- [ ] **QUAL-03**: Compact lead quality summary displayed on the main dashboard page
- [ ] **QUAL-04**: Full lead quality analytics available on a dedicated /portal/analytics page
- [ ] **QUAL-05**: Analytics page includes date range filtering (pill presets + custom picker)

### Portal UX

- [ ] **UX-01**: All new analytics components use client-facing design (polished, clean, not admin copy)
- [ ] **UX-02**: Date range filter bar uses pill-style selector consistent across calls and analytics pages
- [ ] **UX-03**: Portal navigation updated with Calls and Analytics links

## Future Requirements

Deferred to future release.

### Callback Enhancements

- **CALL-07**: Callback rescheduling (change time without cancel+rebook)
- **CALL-08**: Max callback attempts before marking lead as unreachable
- **CALL-09**: Email/SMS fallback notification to broker (in addition to webhook)

### Reporting Enhancements

- **RPT-01**: Call outcome CSV export
- **RPT-02**: Conversion tracking (callback -> deal closed)

### Portal Enhancements

- **PORT-01**: Broker can mark callbacks as completed from portal
- **PORT-02**: Real-time updates on portal analytics via Supabase Realtime

## Out of Scope

| Feature | Reason |
|---------|--------|
| Admin-style drill-down tables on KPI cards | Not appropriate for client-facing portal |
| Broker column in call data | Portal data is already broker-scoped |
| Callback completion from portal | Deferred, handled through Retell/admin for now |
| Real-time portal updates | Polling/refresh sufficient for broker use case |
| Call recording playback | Retell handles this natively |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | Phase 38, Phase 42 | Pending |
| UX-02 | Phase 38 | Pending |
| CALL-01 | Phase 39 | Complete |
| CALL-02 | Phase 39 | Complete |
| CALL-03 | Phase 39 | Complete |
| CALL-04 | Phase 39 | Complete |
| CALL-05 | Phase 39 | Complete |
| CALL-06 | Phase 39 | Complete |
| DASH-01 | Phase 40 | Complete |
| DASH-02 | Phase 40 | Complete |
| DASH-03 | Phase 40 | Complete |
| DASH-04 | Phase 40 | Complete |
| DASH-05 | Phase 40 | Complete |
| QUAL-01 | Phase 41 | Pending |
| QUAL-02 | Phase 41 | Pending |
| QUAL-03 | Phase 41 | Pending |
| QUAL-04 | Phase 41 | Pending |
| QUAL-05 | Phase 41 | Pending |
| UX-03 | Phase 42 | Pending |

**Coverage:**
- v5.0 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

**Note:** UX-01 spans two phases. Phase 38 establishes the client-facing design system for the filter bar and shared components. Phase 42 applies the final polish pass across all v5.0 components for consistency.

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after Phase 40 completion*
