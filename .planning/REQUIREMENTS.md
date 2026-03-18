# Requirements: PPL Lead Management

**Defined:** 2026-03-18
**Core Value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail of why each assignment was made.

## v3.0 Requirements (Shipped)

### Broker Auth

- [x] **AUTH-01**: Broker enters email on /portal/login, receives magic link, clicks to authenticate
- [x] **AUTH-02**: Magic link creates a session scoped to the broker's ID (iron-session with broker_id)
- [x] **AUTH-03**: Portal middleware protects all /portal/* routes, redirects unauthenticated to /portal/login
- [x] **AUTH-04**: Admin can invite a broker by triggering a magic link email from the admin dashboard

### Broker Dashboard

- [x] **DASH-01**: Portal home shows active orders with progress bars (leads_delivered / total_leads)
- [x] **DASH-02**: Portal home shows last 20 leads delivered to the broker with name, vertical, credit score, time
- [x] **DASH-03**: Portal home shows spend summary (total spent all-time, this month, active order value)
- [x] **DASH-04**: Portal home shows delivery health (webhook/email/SMS success rates for this broker)

### Pricing

- [x] **PRICE-01**: Admin can manage a pricing table in Settings (vertical x credit_tier = price per lead in cents)
- [x] **PRICE-02**: Pricing table has default prices and supports per-broker overrides
- [x] **PRICE-03**: Order creation form shows calculated total (lead_count x price_per_lead) before checkout

### Order Creation + Payment

- [x] **ORDER-01**: Broker can create an order: select vertical, credit tier minimum, lead count
- [x] **ORDER-02**: Order creation redirects to Stripe Checkout with correct line items and amount
- [x] **ORDER-03**: Stripe webhook (checkout.session.completed) creates the order in the database and marks it active
- [x] **ORDER-04**: Failed or abandoned checkout does not create an order
- [x] **ORDER-05**: Order record stores stripe_checkout_session_id and stripe_payment_intent_id for traceability

### Broker Self-Service

- [x] **SELF-01**: Broker can pause and resume their own active orders
- [x] **SELF-02**: Broker can update their webhook URL and delivery method preferences
- [x] **SELF-03**: Broker can update their contact hours and timezone
- [x] **SELF-04**: Broker cannot cancel or delete paid orders (admin-only action)

### Lead Visibility

- [x] **LEAD-01**: Broker can view a paginated list of leads assigned to them
- [x] **LEAD-02**: Each lead shows name, vertical, credit score, funding amount, delivery status, time
- [x] **LEAD-03**: Broker cannot see leads assigned to other brokers (RLS enforced)

### Spend & Billing

- [x] **BILL-01**: Broker can view order history with amount paid, date, status, leads delivered
- [x] **BILL-02**: Broker can access Stripe-hosted receipts/invoices for each paid order
- [x] **BILL-03**: Admin dashboard shows revenue summary (total revenue, by broker, by vertical)

### Data Isolation

- [x] **ISO-01**: All portal queries filter by authenticated broker_id (server-side, not client-side)
- [x] **ISO-02**: Supabase RLS policies enforce broker can only read their own leads, orders, and deliveries
- [x] **ISO-03**: Portal API routes validate broker_id matches session before any mutation

## v3.1 Requirements

Requirements for Broker Portal Enhancements milestone. Each maps to roadmap phases.

### Reorder

- [ ] **REORD-01**: Broker can click "Reorder" on a completed order in the portal
- [ ] **REORD-02**: Reorder pre-fills the order form with previous order's vertical, credit tier, and lead count
- [ ] **REORD-03**: Reorder routes through Stripe Checkout (same payment flow as new order)
- [ ] **REORD-04**: New order is created only after successful Stripe payment

### Lead Search & Filters

- [ ] **LSRCH-01**: Broker can search their leads by name
- [ ] **LSRCH-02**: Broker can filter leads by vertical
- [ ] **LSRCH-03**: Broker can filter leads by delivery status
- [ ] **LSRCH-04**: Filters work alongside existing pagination

### Delivery Transparency

- [ ] **DLVR-01**: Broker can view delivery attempt history for each lead
- [ ] **DLVR-02**: Each attempt shows channel (webhook/email/SMS), status, and timestamp
- [ ] **DLVR-03**: Failed attempts show error reason and retry info

### Export & Analytics

- [ ] **EXPT-01**: Broker can export their leads table as CSV
- [ ] **EXPT-02**: Broker can view a monthly spend trend chart on the dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Free broker reorder (no payment) | Brokers must pay for each order via Stripe, admin free reorder stays |
| Broker order editing | Only admin can edit existing orders |
| Bulk lead operations | Not a current use case |
| Lead reassignment by broker | Admin-only action |
| Real-time delivery notifications | Already handled by GHL delivery channels |
| PDF export | CSV sufficient for now |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REORD-01 | TBD | Pending |
| REORD-02 | TBD | Pending |
| REORD-03 | TBD | Pending |
| REORD-04 | TBD | Pending |
| LSRCH-01 | TBD | Pending |
| LSRCH-02 | TBD | Pending |
| LSRCH-03 | TBD | Pending |
| LSRCH-04 | TBD | Pending |
| DLVR-01 | TBD | Pending |
| DLVR-02 | TBD | Pending |
| DLVR-03 | TBD | Pending |
| EXPT-01 | TBD | Pending |
| EXPT-02 | TBD | Pending |

**Coverage:**
- v3.1 requirements: 13 total
- Mapped to phases: 0
- Unmapped: 13

---
*Requirements defined: 2026-03-18*
