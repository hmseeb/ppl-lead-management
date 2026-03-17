# Requirements: PPL Lead Management

**Defined:** 2026-03-17
**Core Value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail of why each assignment was made.

## v3.0 Requirements

Requirements for Broker Portal milestone. Each maps to roadmap phases.

### Broker Auth

- [x] **AUTH-01**: Broker enters email on /portal/login, receives magic link, clicks to authenticate
- [x] **AUTH-02**: Magic link creates a session scoped to the broker's ID (iron-session with broker_id)
- [x] **AUTH-03**: Portal middleware protects all /portal/* routes, redirects unauthenticated to /portal/login
- [x] **AUTH-04**: Admin can invite a broker by triggering a magic link email from the admin dashboard

### Broker Dashboard

- [ ] **DASH-01**: Portal home shows active orders with progress bars (leads_delivered / total_leads)
- [ ] **DASH-02**: Portal home shows last 20 leads delivered to the broker with name, vertical, credit score, time
- [ ] **DASH-03**: Portal home shows spend summary (total spent all-time, this month, active order value)
- [ ] **DASH-04**: Portal home shows delivery health (webhook/email/SMS success rates for this broker)

### Pricing

- [ ] **PRICE-01**: Admin can manage a pricing table in Settings (vertical x credit_tier = price per lead in cents)
- [ ] **PRICE-02**: Pricing table has default prices and supports per-broker overrides
- [ ] **PRICE-03**: Order creation form shows calculated total (lead_count x price_per_lead) before checkout

### Order Creation + Payment

- [ ] **ORDER-01**: Broker can create an order: select vertical, credit tier minimum, lead count
- [ ] **ORDER-02**: Order creation redirects to Stripe Checkout with correct line items and amount
- [ ] **ORDER-03**: Stripe webhook (checkout.session.completed) creates the order in the database and marks it active
- [ ] **ORDER-04**: Failed or abandoned checkout does not create an order
- [ ] **ORDER-05**: Order record stores stripe_checkout_session_id and stripe_payment_intent_id for traceability

### Broker Self-Service

- [ ] **SELF-01**: Broker can pause and resume their own active orders
- [ ] **SELF-02**: Broker can update their webhook URL and delivery method preferences
- [ ] **SELF-03**: Broker can update their contact hours and timezone
- [ ] **SELF-04**: Broker cannot cancel or delete paid orders (admin-only action)

### Lead Visibility

- [ ] **LEAD-01**: Broker can view a paginated list of leads assigned to them
- [ ] **LEAD-02**: Each lead shows name, vertical, credit score, funding amount, delivery status, time
- [ ] **LEAD-03**: Broker cannot see leads assigned to other brokers (RLS enforced)

### Spend & Billing

- [ ] **BILL-01**: Broker can view order history with amount paid, date, status, leads delivered
- [ ] **BILL-02**: Broker can access Stripe-hosted receipts/invoices for each paid order
- [ ] **BILL-03**: Admin dashboard shows revenue summary (total revenue, by broker, by vertical)

### Data Isolation

- [ ] **ISO-01**: All portal queries filter by authenticated broker_id (server-side, not client-side)
- [ ] **ISO-02**: Supabase RLS policies enforce broker can only read their own leads, orders, and deliveries
- [ ] **ISO-03**: Portal API routes validate broker_id matches session before any mutation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Broker self-signup (public registration) | Invite-only via admin for now |
| Subscription billing (recurring Stripe) | Per-order checkout is simpler, subscriptions later |
| Broker-to-broker lead transfer | Not a use case |
| Broker mobile app | Web portal first |
| Refund self-service | Admin handles refunds manually via Stripe dashboard |
| Multi-currency pricing | USD only |
| Broker notifications (email/SMS on lead delivery) | Already handled by GHL delivery channels |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 22 | Complete |
| AUTH-02 | Phase 22 | Complete |
| AUTH-03 | Phase 22 | Complete |
| AUTH-04 | Phase 22 | Complete |
| DASH-01 | Phase 26 | Pending |
| DASH-02 | Phase 26 | Pending |
| DASH-03 | Phase 26 | Pending |
| DASH-04 | Phase 26 | Pending |
| PRICE-01 | Phase 24 | Pending |
| PRICE-02 | Phase 24 | Pending |
| PRICE-03 | Phase 24 | Pending |
| ORDER-01 | Phase 25 | Pending |
| ORDER-02 | Phase 25 | Pending |
| ORDER-03 | Phase 25 | Pending |
| ORDER-04 | Phase 25 | Pending |
| ORDER-05 | Phase 25 | Pending |
| SELF-01 | Phase 27 | Pending |
| SELF-02 | Phase 27 | Pending |
| SELF-03 | Phase 27 | Pending |
| SELF-04 | Phase 27 | Pending |
| LEAD-01 | Phase 28 | Pending |
| LEAD-02 | Phase 28 | Pending |
| LEAD-03 | Phase 28 | Pending |
| BILL-01 | Phase 29 | Pending |
| BILL-02 | Phase 29 | Pending |
| BILL-03 | Phase 29 | Pending |
| ISO-01 | Phase 23 | Pending |
| ISO-02 | Phase 23 | Pending |
| ISO-03 | Phase 23 | Pending |

**Coverage:**
- v3.0 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
