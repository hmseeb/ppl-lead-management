# Roadmap: PPL Lead Management

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-12)
- ✅ **v1.1 Monitoring & Alerting** — Phases 6-9 (shipped 2026-03-13)
- ✅ **v1.2 Broker Hours Enforcement** — Phases 10-12 (shipped 2026-03-13)
- ✅ **v2.0 Smart Scoring Engine** — Phases 13-17 (shipped 2026-03-17)
- ✅ **v2.1 Dashboard Analytics** — Phases 18-21 (shipped 2026-03-17)
- 🚧 **v3.0 Broker Portal** — Phases 22-29 (in progress)

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

<details>
<summary>✅ v2.1 Dashboard Analytics (Phases 18-21) — SHIPPED 2026-03-17</summary>

- [x] Phase 18: Dashboard Filters (2/2 plans)
- [x] Phase 19: Comparison Mode (1/1 plan)
- [x] Phase 20: Chart Adaptation (1/1 plan)
- [x] Phase 21: Auto-Reassignment (1/1 plan)

</details>

### 🚧 v3.0 Broker Portal (In Progress)

**Milestone Goal:** Broker-facing portal where brokers create and manage orders, pay via Stripe, and monitor delivery health. Same app, /portal/* routes.

- [ ] **Phase 22: Broker Auth** - Magic link login, broker sessions, portal middleware, admin invite flow
- [ ] **Phase 23: Data Isolation** - RLS policies, server-side broker_id filtering, mutation guards
- [ ] **Phase 24: Pricing Engine** - Admin pricing table, per-broker overrides, order cost calculation
- [ ] **Phase 25: Order Creation + Payment** - Broker order form, Stripe Checkout, webhook fulfillment
- [ ] **Phase 26: Portal Dashboard** - Broker home with active orders, recent leads, spend, delivery health
- [ ] **Phase 27: Broker Self-Service** - Pause/resume orders, update delivery prefs, contact hours
- [ ] **Phase 28: Lead Visibility** - Broker's paginated lead list with delivery status
- [ ] **Phase 29: Billing + Revenue** - Broker spend history, Stripe receipts, admin revenue view

## Phase Details

### Phase 22: Broker Auth
**Goal**: Brokers can securely access their portal via passwordless email login
**Depends on**: Nothing (first phase of v3.0, builds on existing brokers table)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Broker enters email on /portal/login, receives a magic link email, and clicking it lands them on the portal dashboard authenticated
  2. Broker session persists across browser tabs and survives page refresh (iron-session with broker_id)
  3. Unauthenticated requests to any /portal/* route redirect to /portal/login
  4. Admin can trigger a magic link invite email to a broker from the admin brokers page
**Plans**: 2 plans

Plans:
- [ ] 22-01-PLAN.md — Magic link infrastructure (token table, broker session, send/verify logic, email edge function)
- [ ] 22-02-PLAN.md — Portal login UI, route protection, admin invite button

### Phase 23: Data Isolation
**Goal**: Every portal query and mutation is scoped to the authenticated broker, enforced at both application and database level
**Depends on**: Phase 22 (needs broker session/identity)
**Requirements**: ISO-01, ISO-02, ISO-03
**Success Criteria** (what must be TRUE):
  1. All portal server actions and API routes filter by the session's broker_id before querying
  2. Supabase RLS policies on leads, orders, and deliveries tables restrict reads to rows matching the authenticated broker
  3. Portal API routes reject any mutation where the target resource's broker_id does not match the session
**Plans**: TBD

Plans:
- [ ] 23-01: RLS policies + server-side broker scoping

### Phase 24: Pricing Engine
**Goal**: Admin can configure per-lead pricing by vertical and credit tier, and brokers see accurate order totals before checkout
**Depends on**: Phase 22 (needs portal auth for broker-facing price display)
**Requirements**: PRICE-01, PRICE-02, PRICE-03
**Success Criteria** (what must be TRUE):
  1. Admin can create and edit a pricing table in Settings where each row is a vertical + credit tier combination with a price per lead in cents
  2. Pricing table supports per-broker price overrides that take precedence over default prices
  3. When a broker configures an order (vertical, credit tier, lead count), the form shows the calculated total before proceeding to checkout
**Plans**: TBD

Plans:
- [ ] 24-01: Pricing table schema + admin CRUD
- [ ] 24-02: Price lookup and order cost calculation

### Phase 25: Order Creation + Payment
**Goal**: Brokers can create lead orders and pay via Stripe Checkout, with orders activated automatically on successful payment
**Depends on**: Phase 23 (RLS), Phase 24 (pricing for cost calculation)
**Requirements**: ORDER-01, ORDER-02, ORDER-03, ORDER-04, ORDER-05
**Success Criteria** (what must be TRUE):
  1. Broker can create an order by selecting vertical, credit tier minimum, and lead count from the portal
  2. Submitting the order form redirects to a Stripe Checkout page with correct line items and total amount
  3. After successful Stripe payment, a checkout.session.completed webhook creates the order in the database with status "active" and it appears in the broker's portal
  4. Abandoned or failed checkouts do not create any order record
  5. The created order record contains stripe_checkout_session_id and stripe_payment_intent_id
**Plans**: TBD

Plans:
- [ ] 25-01: Order creation form + Stripe Checkout redirect
- [ ] 25-02: Stripe webhook handler + order fulfillment

### Phase 26: Portal Dashboard
**Goal**: Brokers see a clear picture of their active orders, recent leads, spending, and delivery health on their portal home
**Depends on**: Phase 23 (RLS), Phase 25 (orders exist to display)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Portal home shows all active orders with progress bars displaying leads_delivered / total_leads
  2. Portal home shows the last 20 leads delivered to this broker with name, vertical, credit score, and timestamp
  3. Portal home shows spend summary: total spent all-time, total this month, and total active order value
  4. Portal home shows delivery health with webhook/email/SMS success rates for this broker's deliveries
**Plans**: TBD

Plans:
- [ ] 26-01: Portal dashboard layout + data queries
- [ ] 26-02: Dashboard cards (orders, leads, spend, health)

### Phase 27: Broker Self-Service
**Goal**: Brokers can manage their active orders and delivery preferences without contacting admin
**Depends on**: Phase 25 (orders to manage), Phase 26 (dashboard to access from)
**Requirements**: SELF-01, SELF-02, SELF-03, SELF-04
**Success Criteria** (what must be TRUE):
  1. Broker can pause an active order and resume it, with the order status updating immediately in their portal
  2. Broker can update their webhook URL and delivery method preferences (webhook/email/SMS)
  3. Broker can update their contact hours and timezone from a settings page
  4. Broker cannot cancel or delete a paid order (those controls are absent from the portal UI, admin-only)
**Plans**: TBD

Plans:
- [ ] 27-01: Order controls (pause/resume) + delivery settings
- [ ] 27-02: Broker profile settings (contact hours, timezone, webhook)

### Phase 28: Lead Visibility
**Goal**: Brokers can review all leads assigned to them with delivery status details
**Depends on**: Phase 23 (RLS for lead isolation), Phase 26 (portal structure)
**Requirements**: LEAD-01, LEAD-02, LEAD-03
**Success Criteria** (what must be TRUE):
  1. Broker can view a paginated list of all leads assigned to them from the portal
  2. Each lead row shows name, vertical, credit score, funding amount, delivery status, and timestamp
  3. Broker cannot see any leads assigned to other brokers (verified by RLS, not just UI filtering)
**Plans**: TBD

Plans:
- [ ] 28-01: Broker leads page with pagination + delivery status

### Phase 29: Billing + Revenue
**Goal**: Brokers can review their payment history and access receipts, while admin sees revenue analytics
**Depends on**: Phase 25 (paid orders to display), Phase 26 (portal structure)
**Requirements**: BILL-01, BILL-02, BILL-03
**Success Criteria** (what must be TRUE):
  1. Broker can view their order history showing amount paid, date, status, and leads delivered per order
  2. Broker can click through to Stripe-hosted receipts/invoices for each paid order
  3. Admin dashboard shows a revenue summary with total revenue, revenue by broker, and revenue by vertical
**Plans**: TBD

Plans:
- [ ] 29-01: Broker billing page + Stripe receipt links
- [ ] 29-02: Admin revenue dashboard

## Progress

**Execution Order:**
Phases execute in numeric order: 22 -> 23 -> 24 -> 25 -> 26 -> 27 -> 28 -> 29

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-5 | v1.0 MVP | 13/13 | Complete | 2026-03-12 |
| 6-9 | v1.1 Monitoring | 6/6 | Complete | 2026-03-13 |
| 10-12 | v1.2 Hours | 4/4 | Complete | 2026-03-13 |
| 13-17 | v2.0 Scoring | 9/9 | Complete | 2026-03-17 |
| 18-21 | v2.1 Analytics | 5/5 | Complete | 2026-03-17 |
| 22. Broker Auth | v3.0 Portal | 0/2 | Not started | - |
| 23. Data Isolation | v3.0 Portal | 0/1 | Not started | - |
| 24. Pricing Engine | v3.0 Portal | 0/2 | Not started | - |
| 25. Order Creation + Payment | v3.0 Portal | 0/2 | Not started | - |
| 26. Portal Dashboard | v3.0 Portal | 0/2 | Not started | - |
| 27. Broker Self-Service | v3.0 Portal | 0/2 | Not started | - |
| 28. Lead Visibility | v3.0 Portal | 0/1 | Not started | - |
| 29. Billing + Revenue | v3.0 Portal | 0/2 | Not started | - |

**Total: 29 phases, 37 + 14 plans across 6 milestones**
