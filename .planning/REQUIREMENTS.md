# Requirements: PPL Lead Management

**Defined:** 2026-03-25
**Core Value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail.

## v4.0 Requirements

Requirements for Callback System + Call Reporting milestone. Each maps to roadmap phases.

### Callbacks

- [x] **CALL-01**: Retell can book a callback via POST /api/callbacks with lead_id, broker_id, and scheduled time
- [x] **CALL-02**: Callback booking immediately fires callback_created webhook to broker's crm_webhook_url
- [x] **CALL-03**: pg_cron fires callback_reminder webhook 15 minutes before scheduled time
- [x] **CALL-04**: pg_cron fires callback_due webhook at the scheduled callback time
- [x] **CALL-05**: Admin or Retell can cancel a callback via DELETE /api/callbacks/[id]
- [x] **CALL-06**: Cancellation fires callback_cancelled webhook to broker's crm_webhook_url
- [x] **CALL-07**: All webhooks include full lead + broker payload with type discriminator

### Call Logging

- [x] **LOG-01**: Retell can log call outcomes via POST /api/call-logs
- [x] **LOG-02**: Call log captures: lead_id, broker_id, outcome, duration, retell_call_id
- [x] **LOG-03**: Supported outcomes: transferred, callback_booked, no_answer, voicemail

### Broker Availability

- [x] **AVAIL-01**: GET /api/leads/lookup returns broker contact_hours, timezone, and weekend_pause in response

### Reporting

- [x] **RPT-01**: Admin dashboard page showing call outcome KPI cards (total calls, transferred, callbacks booked, no answer, voicemail)
- [x] **RPT-02**: Call outcome chart with date range filtering
- [x] **RPT-03**: Broker filter scoping all reporting KPIs to a single broker
- [x] **RPT-04**: Upcoming callbacks list showing scheduled callbacks with lead/broker details

## Future Requirements

Deferred to future release.

### Callback Enhancements

- **CALL-08**: Callback rescheduling (change time without cancel+rebook)
- **CALL-09**: Max callback attempts before marking lead as unreachable
- **CALL-10**: Email/SMS fallback notification to broker (in addition to webhook)

### Reporting Enhancements

- **RPT-05**: Broker-facing call history in portal
- **RPT-06**: Call outcome CSV export
- **RPT-07**: Conversion tracking (callback -> deal closed)

## Out of Scope

| Feature | Reason |
|---------|--------|
| GHL calendar integration | pg_cron handles scheduling, brokers can't see GHL calendars in main sub-account |
| Lead self-service booking UI | Retell handles conversation, no web form needed |
| Real-time call monitoring | Out of scope for callback scheduling |
| Call recording storage | Retell handles this natively |
| Priority callbacks | All callbacks treated equally, no queue jumping |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CALL-01 | Phase 34 | Complete |
| CALL-02 | Phase 34 | Complete |
| CALL-03 | Phase 36 | Complete |
| CALL-04 | Phase 36 | Complete |
| CALL-05 | Phase 34 | Complete |
| CALL-06 | Phase 34 | Complete |
| CALL-07 | Phase 34 | Complete |
| LOG-01 | Phase 35 | Complete |
| LOG-02 | Phase 35 | Complete |
| LOG-03 | Phase 35 | Complete |
| AVAIL-01 | Phase 34 | Complete |
| RPT-01 | Phase 37 | Complete |
| RPT-02 | Phase 37 | Complete |
| RPT-03 | Phase 37 | Complete |
| RPT-04 | Phase 37 | Complete |

**Coverage:**
- v4.0 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after roadmap creation*
