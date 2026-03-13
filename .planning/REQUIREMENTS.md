# Requirements: PPL Lead Management

**Defined:** 2026-03-13
**Core Value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail.

## v1.2 Requirements

Requirements for broker hours enforcement. Each maps to roadmap phases.

### Delivery Hours

- [x] **HOUR-01**: Delivery checks broker's contact_hours before firing (anytime = immediate, business_hours = 9-5, custom = start/end range)
- [x] **HOUR-02**: Delivery checks weekend_pause and holds Saturday/Sunday deliveries for brokers with it enabled
- [x] **HOUR-03**: Out-of-hours deliveries get status `queued` instead of firing immediately
- [x] **HOUR-04**: pg_cron job runs every 5 minutes to release queued deliveries when broker's window opens
- [x] **HOUR-05**: Queued deliveries fire in FIFO order (oldest first) when window opens

### Timezone

- [x] **TZ-01**: Read existing timezone column from brokers table (added in ppl-onboarding, IANA format, default America/Los_Angeles)
- [x] **TZ-02**: All contact hours checks use broker's timezone for current time comparison

### Admin Visibility

- [x] **VIS-01**: Admin dashboard shows queued delivery count (deliveries waiting for broker hours)
- [x] **VIS-02**: Broker detail page shows contact hours, timezone, and any queued deliveries
- [x] **VIS-03**: Activity log records when deliveries are queued and when they're released

## Future Requirements

### Broker Self-Service

- **BRKR-01**: Broker-facing dashboard with magic link auth
- **BRKR-02**: Broker can view assigned leads and order progress
- **BRKR-03**: Broker can edit webhook URL, contact hours, timezone

## Out of Scope

| Feature | Reason |
|---------|--------|
| Broker-facing dashboard | Scoped for v2.0 after hours enforcement ships |
| Per-timezone daily digest timing | Digest is admin-facing, not broker-facing |
| Contact hours editing in admin UI | Managed via ppl-onboarding for now |
| Delayed assignment (skip broker if off-hours) | Assignment stays instant, only delivery is delayed |

## Traceability

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| HOUR-01 | Phase 10 | 10-01 | Complete |
| HOUR-02 | Phase 10 | 10-01 | Complete |
| HOUR-03 | Phase 10 | 10-01 | Complete |
| HOUR-04 | Phase 11 | — | Pending |
| HOUR-05 | Phase 11 | — | Pending |
| TZ-01 | Phase 10 | 10-01 | Complete |
| TZ-02 | Phase 10 | 10-01 | Complete |
| VIS-01 | Phase 12 | — | Pending |
| VIS-02 | Phase 12 | — | Pending |
| VIS-03 | Phase 12 | — | Pending |

**Coverage:**
- v1.2 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after Phase 10 plan 01 execution*
