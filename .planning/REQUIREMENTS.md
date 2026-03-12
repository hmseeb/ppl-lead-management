# Requirements: PPL Lead Management

**Defined:** 2026-03-12
**Core Value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Webhook Ingestion

- [ ] **HOOK-01**: System accepts incoming leads via POST /api/leads/incoming with full GHL payload (name, phone, email, business, funding amount/purpose, vertical, credit score, state, AI call notes/status, ghl_contact_id, timestamp)
- [ ] **HOOK-02**: System stores lead in database immediately on receipt and returns 200 within 2 seconds
- [ ] **HOOK-03**: System handles malformed payloads gracefully (log error, return appropriate status, don't crash)
- [ ] **HOOK-04**: System accepts lead updates via PATCH matching on ghl_contact_id (for AI call notes arriving later)
- [ ] **HOOK-05**: System enforces idempotency on ghl_contact_id to prevent duplicate lead creation

### Broker Management

- [ ] **BRKR-01**: Admin can create broker profiles (name, company, email, phone, GHL webhook URL)
- [ ] **BRKR-02**: Admin can edit broker profiles
- [ ] **BRKR-03**: Admin can set broker status (Active / Paused / Completed)
- [ ] **BRKR-04**: Admin can view broker detail with all orders and full lead delivery history

### Order Management

- [ ] **ORDR-01**: Admin can create orders linked to a broker with total leads purchased, vertical criteria (multi-select from MCA, SBA, Equipment Finance, Working Capital, Lines of Credit, All), and credit score minimum
- [ ] **ORDR-02**: System tracks leads_delivered and calculates leads_remaining per order
- [ ] **ORDR-03**: Admin can start, pause, resume, and complete orders
- [ ] **ORDR-04**: Admin can toggle bonus mode on an order (continues delivering leads past total purchased)
- [ ] **ORDR-05**: System auto-completes orders when leads_remaining hits 0 and bonus mode is off
- [ ] **ORDR-06**: Pausing an order removes broker from rotation without losing remaining count or position

### Assignment Engine

- [ ] **ASGN-01**: System filters eligible brokers by matching lead vertical against order accepted verticals (including "All") and lead credit score >= order credit score minimum
- [ ] **ASGN-02**: System uses weighted round-robin rotation based on leads_remaining (bigger orders get proportionally more leads)
- [ ] **ASGN-03**: System tracks last_assigned timestamp per broker per order for rotation fairness
- [ ] **ASGN-04**: System uses Postgres advisory locks for atomic lead assignment (prevents race conditions on concurrent leads)
- [ ] **ASGN-05**: System assigns lead, decrements leads_remaining (unless bonus mode), updates last_assigned, and fires outbound webhook in one atomic flow
- [ ] **ASGN-06**: System holds unmatched leads in unassigned queue with detailed match failure reasons (e.g. "no active orders for MCA vertical", "credit score 520 below all minimums")
- [ ] **ASGN-07**: System logs every assignment decision (which broker, why them, timestamp) for audit

### Lead Delivery

- [ ] **DLVR-01**: System fires outbound POST webhook to assigned broker's GHL webhook URL with full lead payload + reference ID
- [ ] **DLVR-02**: System retries failed webhook deliveries up to 3 times with async pg_cron (non-blocking)
- [ ] **DLVR-03**: System flags permanently failed deliveries in admin dashboard
- [ ] **DLVR-04**: System tracks per-lead delivery status (pending/sent/failed/retrying) with retry count, last attempt timestamp, and error message

### Admin Dashboard

- [ ] **DASH-01**: Overview page shows KPIs: total leads today/this week/this month, assigned vs unassigned count, active brokers count, active orders count
- [ ] **DASH-02**: Overview page shows recent activity feed (last 20 lead assignments with timestamp, lead name, broker, order ID, vertical, credit score)
- [ ] **DASH-03**: Leads table with columns: date/time, name, phone, email, vertical, credit score, funding amount, assigned broker, AI call status, assignment status
- [ ] **DASH-04**: Leads table supports filtering by date range, vertical, credit score range, assigned/unassigned, broker
- [ ] **DASH-05**: Leads table supports search by lead name, phone, or email
- [ ] **DASH-06**: Lead detail view shows full data including AI call notes, assignment history, and webhook delivery status
- [ ] **DASH-07**: Brokers table shows name, company, status, active orders count, total leads delivered, last delivery date
- [ ] **DASH-08**: Broker detail view shows profile, all orders (current and past), and every lead received
- [ ] **DASH-09**: Quick broker actions: pause all active orders, resume all, create new order
- [ ] **DASH-10**: Orders table shows order ID, broker name, total purchased, delivered, remaining, verticals, credit score min, status, date created
- [ ] **DASH-11**: Orders table has color coding: green=Active, yellow=Paused, blue=Bonus Mode, gray=Completed
- [ ] **DASH-12**: Orders table has inline action buttons: pause/resume/bonus mode toggle/complete
- [ ] **DASH-13**: Order detail view shows every lead assigned to that order
- [ ] **DASH-14**: Unassigned queue shows leads that couldn't be matched with reason why
- [ ] **DASH-15**: Admin can manually assign leads from unassigned queue to a broker via dropdown
- [ ] **DASH-16**: Activity log shows all events (lead received, assigned, order created/paused/completed, bonus toggled, manual assignments, webhook failures)
- [ ] **DASH-17**: Activity log filterable by event type, broker, date range

### Real-time

- [ ] **RT-01**: Dashboard updates in real-time via Supabase Realtime when leads arrive, get assigned, or webhook status changes
- [ ] **RT-02**: KPI counters and activity feed update live without page refresh

### Auth & UX

- [ ] **AUTH-01**: Admin access protected by simple password authentication with session cookie
- [ ] **UX-01**: Dark/light theme toggle with persistent preference
- [ ] **UX-02**: Desktop-first professional admin UI using ShadCN components

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Matching Enhancements

- **MATCH-01**: Geographic/state-based matching criteria for broker orders
- **MATCH-02**: Lead quality analytics and conversion pattern tracking

### Scale & Access

- **SCALE-01**: Multi-user admin with role-based access
- **SCALE-02**: Broker self-service portal for order management
- **SCALE-03**: Payment/billing integration for automated invoicing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Ping/post bidding system | Fixed-price model with pre-negotiated orders. Zero value for single-operator. |
| Lead scoring/quality engine | Credit score from GHL is the quality signal. Leads are pre-qualified upstream. |
| Form builder / lead capture | System receives leads via webhook only. No direct capture. |
| Email/SMS to brokers | GHL automations handle broker notifications natively. |
| Lead deduplication engine | Single source (GHL). Unique constraint on ghl_contact_id handles edge cases. |
| Mobile-first responsive UI | Desktop admin tool. Responsive enough for tablet, not mobile-optimized. |
| Multi-tenant marketplace | Single operator. No buyer/seller portals. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (Populated during roadmap creation) | | |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 0
- Unmapped: 40 (pending roadmap)

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after initial definition*
