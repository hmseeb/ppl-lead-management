# Requirements: PPL Lead Management

**Defined:** 2026-03-30
**Core Value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail.

## v5.0 Requirements

Requirements for Broker Portal Analytics milestone. Each maps to roadmap phases.

### Call Reporting

- [ ] **CALL-01**: Broker can view total calls, transferred, callbacks booked, no answer, and voicemail counts on a dedicated /portal/calls page
- [ ] **CALL-02**: Broker can see percentage of total for each call outcome
- [ ] **CALL-03**: Broker can view a stacked bar chart showing call outcome volume over time (daily/weekly bucketing)
- [ ] **CALL-04**: Broker can see a list of their upcoming pending callbacks with lead name and scheduled time
- [ ] **CALL-05**: Broker can filter call reporting data by date range using pill presets (Today, 7d, 30d, 90d)
- [ ] **CALL-06**: Broker can filter call reporting data by custom date range picker

### Dashboard Enrichment

- [ ] **DASH-01**: Broker can see a lead volume trend chart on the dashboard showing leads received over time
- [ ] **DASH-02**: Broker can see a compact call summary card with total calls, transfer rate, and next upcoming callback
- [ ] **DASH-03**: Broker can see their average credit score across all assigned leads
- [ ] **DASH-04**: Broker can see a prominent next callback card with lead name and scheduled time when callbacks are pending
- [ ] **DASH-05**: Dashboard date range filter affects lead volume trend and call summary cards

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
| | | |

**Coverage:**
- v5.0 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after initial definition*
