# Roadmap: PPL Lead Management

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-03-12)
- ✅ **v1.1 Monitoring & Alerting** -- Phases 6-9 (shipped 2026-03-13)
- ✅ **v1.2 Broker Hours Enforcement** -- Phases 10-12 (shipped 2026-03-13)
- ✅ **v2.0 Smart Scoring Engine** -- Phases 13-17 (shipped 2026-03-17)
- ✅ **v2.1 Dashboard Analytics** -- Phases 18-21 (shipped 2026-03-17)
- ✅ **v3.0 Broker Portal** -- Phases 22-29 (shipped 2026-03-17)
- ✅ **v3.1 Broker Portal Enhancements** -- Phases 30-33 (shipped 2026-03-18)
- ✅ **v4.0 Callback System + Call Reporting** -- Phases 34-37 (shipped 2026-03-25)
- **v5.0 Broker Portal Analytics** -- Phases 38-42 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) -- SHIPPED 2026-03-12</summary>

- [x] Phase 1: Foundation + Assignment Engine (3/3 plans)
- [x] Phase 2: Webhook Ingestion (2/2 plans)
- [x] Phase 3: Lead Delivery (2/2 plans)
- [x] Phase 4: Admin Dashboard (4/4 plans)
- [x] Phase 5: Realtime + Polish (2/2 plans)

</details>

<details>
<summary>v1.1 Monitoring & Alerting (Phases 6-9) -- SHIPPED 2026-03-13</summary>

- [x] Phase 6: Alert Foundation (2/2 plans)
- [x] Phase 7: Real-time Alerts (1/1 plan)
- [x] Phase 8: Delivery Stats Dashboard (2/2 plans)
- [x] Phase 9: Daily Digest (1/1 plan)

</details>

<details>
<summary>v1.2 Broker Hours Enforcement (Phases 10-12) -- SHIPPED 2026-03-13</summary>

- [x] Phase 10: Hours-Aware Delivery (1/1 plan)
- [x] Phase 11: Queue Processing (1/1 plan)
- [x] Phase 12: Admin Visibility (2/2 plans)

</details>

<details>
<summary>v2.0 Smart Scoring Engine (Phases 13-17) -- SHIPPED 2026-03-17</summary>

- [x] Phase 13: Order Model Expansion (2/2 plans)
- [x] Phase 14: Pre-flight Validation (2/2 plans)
- [x] Phase 15: Scoring Engine + Tier Gating (2/2 plans)
- [x] Phase 16: Routing Audit Trail (2/2 plans)
- [x] Phase 17: Monthly Recurring Orders (1/1 plan)

</details>

<details>
<summary>v2.1 Dashboard Analytics (Phases 18-21) -- SHIPPED 2026-03-17</summary>

- [x] Phase 18: Dashboard Filters (2/2 plans)
- [x] Phase 19: Comparison Mode (1/1 plan)
- [x] Phase 20: Chart Adaptation (1/1 plan)
- [x] Phase 21: Auto-Reassignment (1/1 plan)

</details>

<details>
<summary>v3.0 Broker Portal (Phases 22-29) -- SHIPPED 2026-03-17</summary>

- [x] Phase 22: Broker Auth (2/2 plans)
- [x] Phase 23: Data Isolation (1/1 plan)
- [x] Phase 24: Pricing Engine (2/2 plans)
- [x] Phase 25: Order Creation + Payment (2/2 plans)
- [x] Phase 26: Portal Dashboard (2/2 plans)
- [x] Phase 27: Broker Self-Service (2/2 plans)
- [x] Phase 28: Lead Visibility (1/1 plan)
- [x] Phase 29: Billing + Revenue (2/2 plans)

</details>

<details>
<summary>v3.1 Broker Portal Enhancements (Phases 30-33) -- SHIPPED 2026-03-18</summary>

- [x] Phase 30: Broker Reorder (1/1 plan)
- [x] Phase 31: Lead Search & Filters (1/1 plan)
- [x] Phase 32: Delivery Transparency (1/1 plan)
- [x] Phase 33: Export & Analytics (2/2 plans)

</details>

<details>
<summary>v4.0 Callback System + Call Reporting (Phases 34-37) -- SHIPPED 2026-03-25</summary>

- [x] Phase 34: Callback API + Broker Availability (2/2 plans)
- [x] Phase 35: Call Logging (1/1 plan)
- [x] Phase 36: Callback Scheduling (1/1 plan)
- [x] Phase 37: Call Reporting Dashboard (2/2 plans)

</details>

### v5.0 Broker Portal Analytics

**Milestone Goal:** Give brokers a polished, client-facing analytics experience with call reporting, lead quality insights, and enriched dashboard KPIs, all with date range filtering.

- [x] **Phase 38: Portal Date Range Filters** - Shared date range filter bar and portal query infrastructure for broker-scoped analytics (completed 2026-03-30)
- [x] **Phase 39: Call Reporting Page** - Dedicated /portal/calls page with KPI cards, outcome chart, and upcoming callbacks (completed 2026-03-30)
- [ ] **Phase 40: Dashboard Enrichment** - New dashboard cards for lead volume trend, credit score, call summary, and next callback
- [ ] **Phase 41: Lead Quality Analytics** - Credit score distribution, vertical mix breakdown on dashboard and dedicated /portal/analytics page
- [ ] **Phase 42: Portal Navigation + Polish** - Updated nav with Calls and Analytics links, final design polish pass across all new components

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

<details>
<summary>v3.1 Phase Details (Shipped)</summary>

### Phase 30: Broker Reorder
**Goal**: Brokers can reorder a completed order with one click, paying via Stripe Checkout with pre-filled parameters
**Depends on**: Phase 25 (existing order creation + Stripe payment infrastructure)
**Requirements**: REORD-01, REORD-02, REORD-03, REORD-04
**Success Criteria** (what must be TRUE):
  1. Broker sees a "Reorder" button on each completed order in their portal orders list
  2. Clicking "Reorder" opens the order form pre-filled with the original order's vertical, credit tier, and lead count
  3. Submitting the reorder redirects to Stripe Checkout with the correct amount (same payment flow as new orders)
  4. The new order only appears in the broker's portal after Stripe payment succeeds (no order created on abandoned checkout)
**Plans**: 1 plan (complete)

### Phase 31: Lead Search & Filters
**Goal**: Brokers can quickly find specific leads using name search and vertical/delivery status filters
**Depends on**: Phase 28 (existing broker leads page with pagination)
**Requirements**: LSRCH-01, LSRCH-02, LSRCH-03, LSRCH-04
**Success Criteria** (what must be TRUE):
  1. Broker can type a name in a search box and the leads table filters to matching results
  2. Broker can select a vertical from a dropdown to filter leads by that vertical
  3. Broker can select a delivery status from a dropdown to filter leads by delivery outcome
  4. Applying any combination of search and filters resets pagination to page 1 and works correctly with the existing paginator
**Plans**: 1 plan (complete)

### Phase 32: Delivery Transparency
**Goal**: Brokers can see the full delivery history for any lead, including every attempt with channel, status, and timing
**Depends on**: Phase 31 (enhanced leads page to expand from)
**Requirements**: DLVR-01, DLVR-02, DLVR-03
**Success Criteria** (what must be TRUE):
  1. Broker can expand or click into any lead row to view its delivery attempt history
  2. Each delivery attempt shows the channel used (webhook, email, or SMS), whether it succeeded or failed, and when it happened
  3. Failed delivery attempts display the error reason and whether a retry was attempted
**Plans**: 1 plan (complete)

### Phase 33: Export & Analytics
**Goal**: Brokers can export their lead data as CSV and view spend trends over time on their dashboard
**Depends on**: Phase 31 (lead filters determine what gets exported), Phase 26 (dashboard to add chart to)
**Requirements**: EXPT-01, EXPT-02
**Success Criteria** (what must be TRUE):
  1. Broker can click an export button on the leads page and download a CSV file containing their filtered leads with all visible columns
  2. Broker's portal dashboard includes a monthly spend trend chart showing spend amounts per month over time
**Plans**: 2 plans (complete)

</details>

<details>
<summary>v4.0 Phase Details (Shipped)</summary>

### Phase 34: Callback API + Broker Availability
**Goal**: Retell can book and cancel callbacks for unavailable brokers, with immediate webhook notification to the broker's CRM
**Depends on**: Nothing (first phase of v4.0, builds on existing brokers + leads tables and webhook infrastructure)
**Requirements**: CALL-01, CALL-02, CALL-05, CALL-06, CALL-07, AVAIL-01
**Success Criteria** (what must be TRUE):
  1. POST /api/callbacks with lead_id, broker_id, and scheduled_time creates a callback record and returns 201 with the callback data
  2. Creating a callback immediately fires a callback_created webhook to the broker's crm_webhook_url with full lead + broker payload and type discriminator
  3. DELETE /api/callbacks/[id] marks the callback as cancelled and immediately fires a callback_cancelled webhook to the broker's crm_webhook_url
  4. GET /api/leads/lookup response includes the matched broker's contact_hours, timezone, and weekend_pause fields
  5. All callback webhooks include the type field (callback_created, callback_cancelled) plus full lead and broker details in the payload
**Plans**: 2 plans (complete)

### Phase 35: Call Logging
**Goal**: Retell can log every call outcome so the system has a complete record of all calls for reporting
**Depends on**: Nothing (independent table, no dependency on callbacks)
**Requirements**: LOG-01, LOG-02, LOG-03
**Success Criteria** (what must be TRUE):
  1. POST /api/call-logs with lead_id, broker_id, outcome, duration, and retell_call_id creates a call log record and returns 201
  2. The outcome field only accepts the four valid values: transferred, callback_booked, no_answer, voicemail
  3. Call logs are queryable by broker_id and date range (needed by Phase 37 reporting)
**Plans**: 1 plan (complete)

### Phase 36: Callback Scheduling
**Goal**: Brokers receive automated reminder and due-time webhook notifications for upcoming callbacks without any manual intervention
**Depends on**: Phase 34 (callbacks table must exist with scheduled_time and status fields)
**Requirements**: CALL-03, CALL-04
**Success Criteria** (what must be TRUE):
  1. A pg_cron job fires a callback_reminder webhook to the broker's crm_webhook_url approximately 15 minutes before the callback's scheduled time
  2. A pg_cron job fires a callback_due webhook to the broker's crm_webhook_url at the callback's scheduled time
  3. Only pending (non-cancelled, non-completed) callbacks receive reminder and due webhooks
  4. Webhooks include the same full lead + broker payload format as callback_created (type discriminator: callback_reminder, callback_due)
**Plans**: 1 plan (complete)

### Phase 37: Call Reporting Dashboard
**Goal**: Admin can see a complete picture of call activity and upcoming callbacks from a dedicated reporting page
**Depends on**: Phase 34 (callbacks data), Phase 35 (call logs data)
**Requirements**: RPT-01, RPT-02, RPT-03, RPT-04
**Success Criteria** (what must be TRUE):
  1. Admin sees a call reporting page with KPI cards showing total calls, transferred count, callbacks booked count, no answer count, and voicemail count
  2. A call outcome chart (bar or area) shows outcome distribution over time, adapting to the selected date range
  3. A broker dropdown filter scopes all KPIs and charts to a single broker's data
  4. An upcoming callbacks section lists scheduled callbacks with lead name, broker name, scheduled time, and status
**Plans**: 2 plans (complete)

</details>

### Phase 38: Portal Date Range Filters
**Goal**: Brokers can filter all portal analytics by date range using pill presets and a custom date picker, with a shared component and query infrastructure reusable across portal pages
**Depends on**: Nothing (first phase of v5.0, builds on existing portal layout and admin date filter patterns)
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. A portal-specific date range filter bar renders pill-style preset buttons (Today, 7d, 30d, 90d) and a custom date range picker with a polished, client-facing design distinct from the admin filter bar
  2. Selecting a date range preset or custom range persists the selection in the URL via nuqs so the filter survives page refresh and is shareable
  3. Portal query helpers in src/lib/portal/queries.ts accept date range parameters and correctly scope data by both broker_id and the selected date range
  4. The filter bar component is designed as a reusable shared component importable by /portal/calls, /portal/analytics, and the dashboard page
**Plans**: 1 plan

Plans:
- [x] 38-01-PLAN.md -- Portal date filter types, reusable filter bar component, date-range-aware portal queries, and dashboard integration

### Phase 39: Call Reporting Page
**Goal**: Brokers can view their call activity on a dedicated /portal/calls page with KPI cards, an outcome trend chart, and a list of upcoming callbacks
**Depends on**: Phase 38 (date range filter bar and query infrastructure)
**Requirements**: CALL-01, CALL-02, CALL-03, CALL-04, CALL-05, CALL-06
**Success Criteria** (what must be TRUE):
  1. Broker sees /portal/calls with KPI cards showing their total calls, transferred count, callbacks booked, no answer count, and voicemail count, each with a percentage-of-total indicator
  2. A stacked bar chart shows the broker's call outcome volume over time with daily or weekly bucketing depending on the selected date range
  3. An upcoming callbacks section lists the broker's pending callbacks with lead name and scheduled time, sorted by soonest first
  4. The date range filter bar (from Phase 38) controls all KPIs, the chart, and the callbacks list on this page
  5. All components use client-facing design (polished cards, clean typography, professional color palette, not copied from admin)
**Plans**: 2 plans

Plans:
- [x] 39-01-PLAN.md -- Broker-scoped call queries, portal KPI cards component, and call outcome chart component
- [x] 39-02-PLAN.md -- Upcoming callbacks component and /portal/calls page assembly with date filter wiring

### Phase 40: Dashboard Enrichment
**Goal**: Brokers see richer insights on their portal home with lead volume trends, credit score averages, call summaries, and next callback awareness
**Depends on**: Phase 38 (date range filtering for trend data), Phase 39 (call query helpers established)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. Broker's portal dashboard shows a lead volume trend chart displaying leads received over the selected date range with appropriate time bucketing
  2. A compact call summary card on the dashboard shows total calls, transfer rate percentage, and the next upcoming callback (if any)
  3. Broker can see their average credit score across all assigned leads within the selected date range
  4. A prominent next callback card appears when the broker has pending callbacks, showing lead name and scheduled time
  5. Changing the dashboard date range filter updates the lead volume trend chart, call summary card, and average credit score in response
**Plans**: 1 plan

Plans:
- [ ] 40-01-PLAN.md -- Dashboard queries, enrichment components, and page layout reorganization

### Phase 41: Lead Quality Analytics
**Goal**: Brokers can understand the quality profile of their leads through credit score distribution and vertical mix breakdowns, available as a dashboard summary and a dedicated analytics page
**Depends on**: Phase 38 (date range filtering), Phase 40 (dashboard structure with new cards)
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05
**Success Criteria** (what must be TRUE):
  1. Broker can see a credit score tier distribution histogram (500-599, 600-679, 680+) showing the count of leads in each tier
  2. Broker can see a vertical mix breakdown chart showing lead distribution by vertical (e.g., pie or horizontal bar chart)
  3. A compact lead quality summary (credit score distribution + vertical mix) is displayed on the main dashboard page
  4. A dedicated /portal/analytics page shows the full lead quality analytics with larger, more detailed charts
  5. The /portal/analytics page has its own date range filter bar (pill presets + custom picker) that controls all analytics on the page
**Plans**: TBD

### Phase 42: Portal Navigation + Polish
**Goal**: Portal navigation is updated with new page links and all v5.0 components receive a final design polish pass for a cohesive client-facing experience
**Depends on**: Phase 39 (calls page exists), Phase 41 (analytics page exists)
**Requirements**: UX-03, UX-01
**Success Criteria** (what must be TRUE):
  1. Portal sidebar/navigation includes Calls and Analytics links that route to /portal/calls and /portal/analytics respectively
  2. Navigation highlights the active page correctly when on Calls or Analytics routes
  3. All v5.0 analytics components (KPI cards, charts, filter bars, callback lists) have consistent spacing, typography, color palette, and hover states across all portal pages
  4. The overall portal analytics experience feels cohesive and professional, distinct from the admin dashboard aesthetic
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 38 -> 39 -> 40 -> 41 -> 42

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-5 | v1.0 MVP | 13/13 | Complete | 2026-03-12 |
| 6-9 | v1.1 Monitoring | 6/6 | Complete | 2026-03-13 |
| 10-12 | v1.2 Hours | 4/4 | Complete | 2026-03-13 |
| 13-17 | v2.0 Scoring | 9/9 | Complete | 2026-03-17 |
| 18-21 | v2.1 Analytics | 5/5 | Complete | 2026-03-17 |
| 22-29 | v3.0 Portal | 14/14 | Complete | 2026-03-17 |
| 30-33 | v3.1 Enhancements | 5/5 | Complete | 2026-03-18 |
| 34-37 | v4.0 Callbacks | 6/6 | Complete | 2026-03-25 |
| 38. Portal Date Range Filters | 1/1 | Complete    | 2026-03-30 | - |
| 39. Call Reporting Page | 2/2 | Complete    | 2026-03-30 | - |
| 40. Dashboard Enrichment | v5.0 Analytics | 0/1 | Not started | - |
| 41. Lead Quality Analytics | v5.0 Analytics | 0/TBD | Not started | - |
| 42. Portal Navigation + Polish | v5.0 Analytics | 0/TBD | Not started | - |

**Total: 42 phases, 72+ plans across 9 milestones**
