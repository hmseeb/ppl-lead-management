# Roadmap: PPL Lead Management

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-12)
- ✅ **v1.1 Monitoring & Alerting** — Phases 6-9 (shipped 2026-03-13)
- ✅ **v1.2 Broker Hours Enforcement** — Phases 10-12 (shipped 2026-03-13)
- ✅ **v2.0 Smart Scoring Engine** — Phases 13-17 (shipped 2026-03-17)
- ✅ **v2.1 Dashboard Analytics** — Phases 18-21 (shipped 2026-03-17)
- ✅ **v3.0 Broker Portal** — Phases 22-29 (shipped 2026-03-17)
- **v3.1 Broker Portal Enhancements** — Phases 30-33 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) — SHIPPED 2026-03-12</summary>

- [x] Phase 1: Foundation + Assignment Engine (3/3 plans)
- [x] Phase 2: Webhook Ingestion (2/2 plans)
- [x] Phase 3: Lead Delivery (2/2 plans)
- [x] Phase 4: Admin Dashboard (4/4 plans)
- [x] Phase 5: Realtime + Polish (2/2 plans)

</details>

<details>
<summary>v1.1 Monitoring & Alerting (Phases 6-9) — SHIPPED 2026-03-13</summary>

- [x] Phase 6: Alert Foundation (2/2 plans)
- [x] Phase 7: Real-time Alerts (1/1 plan)
- [x] Phase 8: Delivery Stats Dashboard (2/2 plans)
- [x] Phase 9: Daily Digest (1/1 plan)

</details>

<details>
<summary>v1.2 Broker Hours Enforcement (Phases 10-12) — SHIPPED 2026-03-13</summary>

- [x] Phase 10: Hours-Aware Delivery (1/1 plan)
- [x] Phase 11: Queue Processing (1/1 plan)
- [x] Phase 12: Admin Visibility (2/2 plans)

</details>

<details>
<summary>v2.0 Smart Scoring Engine (Phases 13-17) — SHIPPED 2026-03-17</summary>

- [x] Phase 13: Order Model Expansion (2/2 plans)
- [x] Phase 14: Pre-flight Validation (2/2 plans)
- [x] Phase 15: Scoring Engine + Tier Gating (2/2 plans)
- [x] Phase 16: Routing Audit Trail (2/2 plans)
- [x] Phase 17: Monthly Recurring Orders (1/1 plan)

</details>

<details>
<summary>v2.1 Dashboard Analytics (Phases 18-21) — SHIPPED 2026-03-17</summary>

- [x] Phase 18: Dashboard Filters (2/2 plans)
- [x] Phase 19: Comparison Mode (1/1 plan)
- [x] Phase 20: Chart Adaptation (1/1 plan)
- [x] Phase 21: Auto-Reassignment (1/1 plan)

</details>

<details>
<summary>v3.0 Broker Portal (Phases 22-29) — SHIPPED 2026-03-17</summary>

- [x] Phase 22: Broker Auth (2/2 plans)
- [x] Phase 23: Data Isolation (1/1 plan)
- [x] Phase 24: Pricing Engine (2/2 plans)
- [x] Phase 25: Order Creation + Payment (2/2 plans)
- [x] Phase 26: Portal Dashboard (2/2 plans)
- [x] Phase 27: Broker Self-Service (2/2 plans)
- [x] Phase 28: Lead Visibility (1/1 plan)
- [x] Phase 29: Billing + Revenue (2/2 plans)

</details>

### v3.1 Broker Portal Enhancements

**Milestone Goal:** Enhance the broker portal with reorder flow (paid via Stripe), lead search/filters, delivery transparency, and export/analytics. All work isolated to portal directories. Zero impact on admin dashboard.

- [x] **Phase 30: Broker Reorder** - Reorder completed orders with pre-filled Stripe Checkout payment (completed 2026-03-18)
- [x] **Phase 31: Lead Search & Filters** - Name search, vertical/delivery status filters on broker leads page (completed 2026-03-18)
- [x] **Phase 32: Delivery Transparency** - Per-lead delivery attempt history with channel, status, and timestamps (completed 2026-03-18)
- [x] **Phase 33: Export & Analytics** - CSV export for leads, monthly spend trend chart on dashboard (completed 2026-03-18)

## Phase Details

<details>
<summary>v3.0 Phase Details (Shipped)</summary>

### Phase 22: Broker Auth
**Goal**: Brokers can securely access their portal via passwordless email login
**Depends on**: Nothing (first phase of v3.0, builds on existing brokers table)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Broker enters email on /portal/login, receives a magic link email, and clicking it lands them on the portal dashboard authenticated
  2. Broker session persists across browser tabs and survives page refresh (iron-session with broker_id)
  3. Unauthenticated requests to any /portal/* route redirect to /portal/login
  4. Admin can trigger a magic link invite email to a broker from the admin brokers page
**Plans**: 2 plans (complete)

### Phase 23: Data Isolation
**Goal**: Every portal query and mutation is scoped to the authenticated broker, enforced at both application and database level
**Depends on**: Phase 22 (needs broker session/identity)
**Requirements**: ISO-01, ISO-02, ISO-03
**Success Criteria** (what must be TRUE):
  1. All portal server actions and API routes filter by the session's broker_id before querying
  2. Supabase RLS policies on leads, orders, and deliveries tables restrict reads to rows matching the authenticated broker
  3. Portal API routes reject any mutation where the target resource's broker_id does not match the session
**Plans**: 1 plan (complete)

### Phase 24: Pricing Engine
**Goal**: Admin can configure per-lead pricing by vertical and credit tier, and brokers see accurate order totals before checkout
**Depends on**: Phase 22 (needs portal auth for broker-facing price display)
**Requirements**: PRICE-01, PRICE-02, PRICE-03
**Success Criteria** (what must be TRUE):
  1. Admin can create and edit a pricing table in Settings where each row is a vertical + credit tier combination with a price per lead in cents
  2. Pricing table supports per-broker price overrides that take precedence over default prices
  3. When a broker configures an order (vertical, credit tier, lead count), the form shows the calculated total before proceeding to checkout
**Plans**: 2 plans (complete)

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
**Plans**: 2 plans (complete)

### Phase 26: Portal Dashboard
**Goal**: Brokers see a clear picture of their active orders, recent leads, spending, and delivery health on their portal home
**Depends on**: Phase 23 (RLS), Phase 25 (orders exist to display)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Portal home shows all active orders with progress bars displaying leads_delivered / total_leads
  2. Portal home shows the last 20 leads delivered to this broker with name, vertical, credit score, and timestamp
  3. Portal home shows spend summary: total spent all-time, total this month, and total active order value
  4. Portal home shows delivery health with webhook/email/SMS success rates for this broker's deliveries
**Plans**: 2 plans (complete)

### Phase 27: Broker Self-Service
**Goal**: Brokers can manage their active orders and delivery preferences without contacting admin
**Depends on**: Phase 25 (orders to manage), Phase 26 (dashboard to access from)
**Requirements**: SELF-01, SELF-02, SELF-03, SELF-04
**Success Criteria** (what must be TRUE):
  1. Broker can pause an active order and resume it, with the order status updating immediately in their portal
  2. Broker can update their webhook URL and delivery method preferences (webhook/email/SMS)
  3. Broker can update their contact hours and timezone from a settings page
  4. Broker cannot cancel or delete a paid order (those controls are absent from the portal UI, admin-only)
**Plans**: 2 plans (complete)

### Phase 28: Lead Visibility
**Goal**: Brokers can review all leads assigned to them with delivery status details
**Depends on**: Phase 23 (RLS for lead isolation), Phase 26 (portal structure)
**Requirements**: LEAD-01, LEAD-02, LEAD-03
**Success Criteria** (what must be TRUE):
  1. Broker can view a paginated list of all leads assigned to them from the portal
  2. Each lead row shows name, vertical, credit score, funding amount, delivery status, and timestamp
  3. Broker cannot see any leads assigned to other brokers (verified by RLS, not just UI filtering)
**Plans**: 1 plan (complete)

### Phase 29: Billing + Revenue
**Goal**: Brokers can review their payment history and access receipts, while admin sees revenue analytics
**Depends on**: Phase 25 (paid orders to display), Phase 26 (portal structure)
**Requirements**: BILL-01, BILL-02, BILL-03
**Success Criteria** (what must be TRUE):
  1. Broker can view their order history showing amount paid, date, status, and leads delivered per order
  2. Broker can click through to Stripe-hosted receipts/invoices for each paid order
  3. Admin dashboard shows a revenue summary with total revenue, revenue by broker, and revenue by vertical
**Plans**: 2 plans (complete)

</details>

### Phase 30: Broker Reorder
**Goal**: Brokers can reorder a completed order with one click, paying via Stripe Checkout with pre-filled parameters
**Depends on**: Phase 25 (existing order creation + Stripe payment infrastructure)
**Requirements**: REORD-01, REORD-02, REORD-03, REORD-04
**Success Criteria** (what must be TRUE):
  1. Broker sees a "Reorder" button on each completed order in their portal orders list
  2. Clicking "Reorder" opens the order form pre-filled with the original order's vertical, credit tier, and lead count
  3. Submitting the reorder redirects to Stripe Checkout with the correct amount (same payment flow as new orders)
  4. The new order only appears in the broker's portal after Stripe payment succeeds (no order created on abandoned checkout)
**Plans**: 1 plan

Plans:
- [x] 30-01-PLAN.md -- Reorder flow (UI button, pre-filled form, Stripe Checkout redirect)

### Phase 31: Lead Search & Filters
**Goal**: Brokers can quickly find specific leads using name search and vertical/delivery status filters
**Depends on**: Phase 28 (existing broker leads page with pagination)
**Requirements**: LSRCH-01, LSRCH-02, LSRCH-03, LSRCH-04
**Success Criteria** (what must be TRUE):
  1. Broker can type a name in a search box and the leads table filters to matching results
  2. Broker can select a vertical from a dropdown to filter leads by that vertical
  3. Broker can select a delivery status from a dropdown to filter leads by delivery outcome
  4. Applying any combination of search and filters resets pagination to page 1 and works correctly with the existing paginator
**Plans**: 1 plan

Plans:
- [x] 31-01-PLAN.md -- Search input, vertical/delivery status dropdowns, pagination integration with filter persistence

### Phase 32: Delivery Transparency
**Goal**: Brokers can see the full delivery history for any lead, including every attempt with channel, status, and timing
**Depends on**: Phase 31 (enhanced leads page to expand from)
**Requirements**: DLVR-01, DLVR-02, DLVR-03
**Success Criteria** (what must be TRUE):
  1. Broker can expand or click into any lead row to view its delivery attempt history
  2. Each delivery attempt shows the channel used (webhook, email, or SMS), whether it succeeded or failed, and when it happened
  3. Failed delivery attempts display the error reason and whether a retry was attempted
**Plans**: 1 plan

Plans:
- [x] 32-01-PLAN.md -- Expandable lead rows with delivery attempt timeline (channel/status/error/retry details)

### Phase 33: Export & Analytics
**Goal**: Brokers can export their lead data as CSV and view spend trends over time on their dashboard
**Depends on**: Phase 31 (lead filters determine what gets exported), Phase 26 (dashboard to add chart to)
**Requirements**: EXPT-01, EXPT-02
**Success Criteria** (what must be TRUE):
  1. Broker can click an export button on the leads page and download a CSV file containing their filtered leads with all visible columns
  2. Broker's portal dashboard includes a monthly spend trend chart showing spend amounts per month over time
**Plans:** 2/2 plans complete

Plans:
- [x] 33-01-PLAN.md -- CSV export (server action to generate CSV from filtered leads, download trigger on leads page)
- [ ] 33-02-PLAN.md -- Spend trend chart (monthly aggregation query, recharts bar chart on portal dashboard)

## Progress

**Execution Order:**
Phases execute in numeric order: 30 -> 31 -> 32 -> 33

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-5 | v1.0 MVP | 13/13 | Complete | 2026-03-12 |
| 6-9 | v1.1 Monitoring | 6/6 | Complete | 2026-03-13 |
| 10-12 | v1.2 Hours | 4/4 | Complete | 2026-03-13 |
| 13-17 | v2.0 Scoring | 9/9 | Complete | 2026-03-17 |
| 18-21 | v2.1 Analytics | 5/5 | Complete | 2026-03-17 |
| 22-29 | v3.0 Portal | 14/14 | Complete | 2026-03-17 |
| 30. Broker Reorder | 1/1 | Complete    | 2026-03-18 | - |
| 31. Lead Search & Filters | 1/1 | Complete    | 2026-03-18 | - |
| 32. Delivery Transparency | 1/1 | Complete    | 2026-03-18 | - |
| 33. Export & Analytics | 2/2 | Complete    | 2026-03-18 | - |

**Total: 33 phases, 60 plans across 7 milestones**
