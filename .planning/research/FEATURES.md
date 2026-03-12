# Feature Research

**Domain:** Lead Distribution & Round-Robin Management (Internal Admin Tool, Pay-Per-Lead Vertical)
**Researched:** 2026-03-12
**Confidence:** HIGH

## Feature Landscape

This research maps the feature landscape of lead distribution systems (Boberdoo, LeadsPedia, CAKE, Lead Prosper, LeanData, and custom CRM lead routing) against what PPL Lead Management actually needs as an internal admin tool. The critical distinction: PPL is NOT a multi-tenant lead marketplace. It is a single-operator tool that receives leads from one source (GHL), matches them to brokers based on order criteria, and fires them to broker GHL sub-accounts. This context shapes every recommendation below.

### Table Stakes (Users Expect These)

Features the admin expects to exist. Missing these = the tool is broken for its purpose.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Inbound webhook endpoint** | Core data ingestion. Every competitor accepts leads via POST. Without this, leads don't enter the system. | LOW | Single endpoint, validate payload, store immediately. GHL sends standard webhook payloads. |
| **Lead storage with full data capture** | Every system stores the raw lead record. Needed for audit, debugging, manual review. | LOW | Store all fields from GHL payload. Include timestamps, source metadata. |
| **Lead update via PATCH** | AI call notes arrive after initial lead creation. Every mature system handles lead enrichment post-capture. | LOW | Match on ghl_contact_id. Merge new fields, preserve originals. |
| **Broker profile management** | Boberdoo, LeadsPedia, CAKE all have buyer/broker management. Can't route leads without knowing who the brokers are. | LOW | CRUD for broker records. Name, company, GHL webhook URL, status (active/inactive). |
| **Order management with criteria matching** | Core of pay-per-lead. Boberdoo calls these "filter sets," LeadsPedia calls them "buyer criteria." Orders define what a broker wants and how many. | MEDIUM | Vertical multi-select + credit score minimum + total leads purchased. Start/pause/resume/complete lifecycle. |
| **Criteria-based lead-to-order matching** | Every competitor routes on criteria (geo, vertical, score, etc.). Without matching, leads go to wrong brokers. | MEDIUM | Match lead vertical + credit score against active orders. Must handle multiple matching orders (then apply rotation). |
| **Weighted round-robin distribution** | Industry standard. Boberdoo supports weighted logic. LeanData, CAKE support weighted distribution. Pure round-robin is too simplistic for variable order sizes. | MEDIUM | Weight by leads_remaining so bigger orders get proportionally more leads. This is the core algorithm. |
| **Outbound webhook delivery to brokers** | Every system delivers leads to buyers. Boberdoo uses "lead delivery," LeadsPedia uses "real-time delivery." For PPL, this means POST to broker's GHL webhook URL. | MEDIUM | Fire lead data to broker's GHL sub-account webhook. Must be fast (sub-second) and reliable. |
| **Webhook retry with failure handling** | Industry standard. Every serious system retries failed deliveries. Svix, Hookdeck, and all major platforms recommend 3-7 retries with exponential backoff. | MEDIUM | pg_cron async retries. 3 attempts with backoff. Flag failures in dashboard. Dead letter pattern for permanent failures. |
| **Unassigned lead queue** | Salesforce calls this a "lead queue," Boberdoo has reject/hold queues. Leads that match no criteria must go somewhere visible, not disappear silently. | LOW | Store with reason for non-match (no active orders, no criteria match, all orders paused). |
| **Manual lead assignment** | Every system with an unassigned queue allows manual override. Admin must be able to fix routing decisions. | LOW | Pick lead from unassigned queue, select broker/order, assign. Log the manual action. |
| **Admin dashboard with KPIs** | Boberdoo has "premium dashboards," LeadsPedia has "real-time analytics," CAKE has reporting. An admin tool without a dashboard is just a database. | MEDIUM | Total leads today, assignment rate, avg assignment time, leads by broker, failed webhooks count, unassigned count. |
| **Leads table with filtering and search** | Every competitor has lead browsing. Admin needs to find specific leads, filter by status/broker/date, and view details. | MEDIUM | Sortable, filterable table. Status filter (assigned, unassigned, failed). Search by name/email/phone. Detail view showing full lead data + assignment history. |
| **Brokers table with lead history** | Boberdoo tracks "line-by-line transactions." Admin needs to see which leads went to which broker and their order fulfillment status. | LOW | Broker list with active order counts, total leads delivered, last delivery timestamp. Click-through to broker detail with lead history. |
| **Orders table with status and actions** | Core operational view. Admin needs to see all orders, their fulfillment progress, and take actions (pause/resume/complete). | MEDIUM | Color-coded status (active/paused/completed). Progress bars showing leads_delivered/leads_purchased. Inline action buttons. |
| **Activity log** | Boberdoo tracks all vendor/partner activity. LeadsPedia has "dynamic tracking." Audit trail is table stakes for any system handling money-adjacent operations. | MEDIUM | Log every event: lead received, lead assigned, webhook sent, webhook failed, order created, order paused, manual assignment, etc. Filterable by type, date, broker. |
| **Atomic lead assignment (concurrency safety)** | Race conditions in lead distribution cause duplicate assignments. Every production system needs locking. Postgres advisory locks are the right tool here. | MEDIUM | Advisory lock on the assignment function. Prevent two concurrent leads from being assigned to the same order slot. Critical for data integrity. |
| **Simple auth** | Even internal tools need auth. Single password + session cookie is appropriate for a small team admin tool. | LOW | Match ppl-onboarding pattern. bcrypt password, httpOnly session cookie. |

### Differentiators (Competitive Advantage)

Features that aren't expected for a v1 internal tool but add significant operational value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Real-time dashboard updates** | Most internal admin tools require manual refresh. Live-updating KPIs and tables via Supabase Realtime give the admin instant visibility. Matches the speed requirement (leads assigned in seconds, dashboard reflects immediately). | MEDIUM | Supabase Realtime subscriptions on leads, assignments, webhook_logs tables. Dashboard components subscribe to changes. |
| **Automatic order completion** | When leads_remaining hits 0, order auto-completes. Boberdoo and LeadsPedia have cap management, but auto-completion with optional bonus mode override is a nice touch. Prevents over-delivery. | LOW | Check leads_remaining after each assignment. If 0 and bonus_mode is false, set status to completed. |
| **Bonus mode toggle** | Unique to PPL's model. Allows a broker to keep receiving leads after their order is technically fulfilled. Not a standard feature in competitors (they use hard caps). This rewards good brokers and generates additional revenue. | LOW | Boolean flag on order. When true, skip the leads_remaining check during assignment. Track bonus leads separately for billing. |
| **Match failure reason tracking** | Most systems just dump leads in an unassigned queue. Showing WHY a lead didn't match (no active orders for vertical X, credit score too low for all orders, all matching orders paused) gives the admin actionable intelligence. | LOW | During matching, collect rejection reasons per order. Store as JSON array on the unassigned lead record. Display in unassigned queue UI. |
| **Sub-second assignment latency** | Research confirms: responding within 1 minute increases conversion by 391%. The PPL use case (business owner waiting on thank-you page for AI call) demands even faster. Most systems aim for "under 10 seconds." Sub-second is a real differentiator. | MEDIUM | Optimized matching query, advisory lock, outbound webhook fire. All in one synchronous flow. No queue-based delay for the happy path. |
| **Webhook delivery status visibility** | Lead Prosper shows "complete lead lifecycle." Most basic admin tools don't show webhook delivery status per lead. Seeing sent/pending/failed/retrying per delivery gives operational confidence. | LOW | Status column on lead detail: pending -> sent -> confirmed or failed. Show retry count, last attempt timestamp, error message. |
| **Dark/light theme toggle** | Not a differentiator competitively, but a quality-of-life feature for an admin who stares at this dashboard all day. Matches ppl-onboarding. | LOW | ShadCN theme provider. Persistent preference in localStorage. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific project.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Ping/post bidding system** | Boberdoo, CAKE, and Lead Prosper all offer ping/post for real-time price negotiation. Seems like the "pro" way to distribute leads. | PPL has a fixed-price model with pre-negotiated orders. Adding bidding adds massive complexity (bid collection, timeout handling, fallback logic) with zero value for a single-operator system. | Fixed criteria matching + weighted rotation. Price is determined at order creation time, not per-lead. |
| **Multi-tenant buyer portal** | Boberdoo and Lead Prosper offer buyer self-service portals. Brokers could manage their own criteria. | Adds auth complexity, permission management, and UI surface area. PPL has a small number of brokers managed by one admin. The ppl-onboarding app already handles broker data collection. | Admin manages all broker/order config. Broker preferences flow through the onboarding app. |
| **Lead scoring/quality engine** | Boberdoo has LeadQC. LeadsPedia has lead validation. CAKE has enrichment. Seems like every competitor has it. | PPL receives pre-qualified leads (credit pull already done, AI call in progress). Adding a separate scoring engine duplicates work already done upstream. The credit score IS the quality signal. | Use the credit score from GHL as the quality filter. No separate scoring engine. |
| **Geographic/state-based routing** | Every major competitor supports geo-targeting. Boberdoo filters by zip radius, LeadsPedia by county/state/zip. | Explicitly out of scope per PROJECT.md. Adding geo adds schema complexity, matching complexity, and UI complexity. Can be layered on later if needed. | Defer to future iteration. Schema should be extensible (JSONB criteria field) so geo can be added without migration. |
| **Email/SMS notifications to brokers** | Lead Prosper and others send alerts. Seems basic to notify brokers of new leads. | GHL automations already handle broker notifications. Building notification infrastructure duplicates what GHL does natively and better. | Webhook to GHL triggers the broker's existing notification automations. |
| **Payment/billing integration** | Boberdoo has automated invoicing. LeadsPedia has credit management. | Orders are tracked manually for now. Billing adds Stripe integration, invoice generation, credit tracking. Massive scope expansion for a v1. | Track leads_delivered count per order. Manual billing off those numbers. Add billing in v2 if volume justifies it. |
| **Lead deduplication engine** | Lead Prosper, Boberdoo, CAKE all have dupe checking. Standard in lead marketplaces. | PPL receives leads from a single source (GHL main account). Duplicates would be a GHL problem, not a PPL problem. A simple unique constraint on ghl_contact_id handles the edge case. | Unique constraint on ghl_contact_id. PATCH endpoint handles updates to existing leads. |
| **Form builder / lead capture** | Boberdoo has a form builder. LeadsPedia has lead capture forms. | PPL doesn't capture leads. It receives them via webhook from GHL. Building capture UI is completely out of scope. | Webhook-only ingestion. |
| **Multi-user admin with roles** | Most enterprise tools have role-based access. Seems like good practice. | Single admin for v1. Adding user management, roles, permissions is a full auth system. Over-engineered for the current team size. | Single shared password. Add multi-user auth if/when more admins are needed. |
| **Mobile-responsive admin UI** | Modern tools "should" be mobile-friendly. | This is a desktop-first admin tool used at a workstation. Mobile optimization doubles CSS work for zero operational value. | Desktop-optimized layouts. Responsive enough not to break on tablet, but not mobile-first. |

## Feature Dependencies

```
[Inbound Webhook]
    +---> [Lead Storage]
              +---> [Lead Update (PATCH)]
              +---> [Criteria Matching] --requires--> [Order Management] --requires--> [Broker Profiles]
                        +---> [Weighted Round-Robin] --requires--> [Atomic Assignment (Advisory Locks)]
                                    +---> [Outbound Webhook Delivery] --requires--> [Broker Profiles (GHL URL)]
                                                +---> [Webhook Retry (pg_cron)]
                                    +---> [Auto Order Completion] --enhances--> [Bonus Mode Toggle]
              +---> [Unassigned Queue] --enhances--> [Match Failure Reasons]
                        +---> [Manual Assignment]

[Activity Log] --observes--> [All of the above]

[Admin Dashboard]
    +---> [KPI Overview] --reads--> [Lead Storage, Assignments, Webhooks]
    +---> [Leads Table] --reads--> [Lead Storage]
    +---> [Brokers Table] --reads--> [Broker Profiles, Assignments]
    +---> [Orders Table] --reads--> [Order Management]
    +---> [Unassigned Queue View] --reads--> [Unassigned Queue]
    +---> [Activity Feed] --reads--> [Activity Log]

[Real-time Updates (Supabase Realtime)] --enhances--> [All Dashboard Views]

[Auth] --gates--> [Admin Dashboard]
```

### Dependency Notes

- **Criteria Matching requires Order Management and Broker Profiles:** Cannot match leads without knowing what criteria exist (orders) and who to send to (brokers). These must be built first.
- **Weighted Round-Robin requires Atomic Assignment:** The rotation algorithm and the locking mechanism are inseparable. Building rotation without concurrency safety creates a ticking time bomb.
- **Outbound Webhook requires Broker Profiles:** Need the GHL webhook URL from the broker record to deliver leads.
- **Webhook Retry enhances Outbound Webhook:** Retry logic is layered on top of the basic delivery mechanism. Can ship basic delivery first, add retry second.
- **Auto Order Completion enhances Bonus Mode:** Bonus mode is a flag that modifies the auto-completion behavior. Auto-completion must exist first for the toggle to make sense.
- **Activity Log observes everything:** It's a cross-cutting concern. Best implemented as database triggers or middleware that logs events as they happen.
- **Real-time Updates enhances all Dashboard Views:** Can be added after the dashboard is functional with manual refresh. Doesn't block core functionality.

## MVP Definition

### Launch With (v1)

Minimum viable product. What's needed to actually route leads to brokers.

- [ ] **Inbound webhook endpoint** - without it, no leads enter the system
- [ ] **Lead storage** - without it, data is lost
- [ ] **Lead update (PATCH)** - AI call notes must be captured
- [ ] **Broker profiles CRUD** - must know who to send leads to
- [ ] **Order management with criteria** - must know what each broker wants
- [ ] **Criteria matching + weighted round-robin** - core value of the product
- [ ] **Atomic assignment with advisory locks** - can't ship rotation without safety
- [ ] **Outbound webhook to broker GHL** - leads must actually be delivered
- [ ] **Unassigned queue** - leads that don't match must be visible, not lost
- [ ] **Admin dashboard (KPIs + all tables)** - admin needs to see what's happening
- [ ] **Activity log** - audit trail is non-negotiable for a system that handles lead assignment
- [ ] **Simple password auth** - protect the admin interface

### Add After Validation (v1.x)

Features to add once core routing is proven reliable.

- [ ] **Webhook retry with pg_cron** - add once basic delivery is stable and failure patterns are understood
- [ ] **Real-time dashboard updates** - add once the dashboard views are finalized and stable
- [ ] **Bonus mode toggle** - add once order lifecycle (start/pause/complete) is proven
- [ ] **Match failure reason tracking** - add once the unassigned queue is being actively used
- [ ] **Manual assignment from queue** - add once unassigned queue has leads that need human intervention
- [ ] **Dark/light theme** - quality of life, add anytime

### Future Consideration (v2+)

Features to defer until the system has operational history.

- [ ] **Geographic/state-based matching** - PROJECT.md explicitly defers this. Add when brokers demand it.
- [ ] **Broker self-service portal** - add if broker count grows beyond what one admin can manage
- [ ] **Payment/billing integration** - add if manual billing becomes unsustainable
- [ ] **Multi-user admin with roles** - add if team grows
- [ ] **Lead quality analytics** - add once there's enough data to analyze conversion patterns

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Inbound webhook endpoint | HIGH | LOW | P1 |
| Lead storage | HIGH | LOW | P1 |
| Lead update (PATCH) | HIGH | LOW | P1 |
| Broker profiles CRUD | HIGH | LOW | P1 |
| Order management + criteria | HIGH | MEDIUM | P1 |
| Criteria matching | HIGH | MEDIUM | P1 |
| Weighted round-robin | HIGH | MEDIUM | P1 |
| Atomic assignment (advisory locks) | HIGH | MEDIUM | P1 |
| Outbound webhook delivery | HIGH | MEDIUM | P1 |
| Unassigned queue | HIGH | LOW | P1 |
| Activity log | HIGH | MEDIUM | P1 |
| Simple auth | MEDIUM | LOW | P1 |
| Admin dashboard (KPIs) | HIGH | MEDIUM | P1 |
| Leads table + search/filter | HIGH | MEDIUM | P1 |
| Brokers table + history | MEDIUM | LOW | P1 |
| Orders table + actions | HIGH | MEDIUM | P1 |
| Unassigned queue view | MEDIUM | LOW | P1 |
| Webhook retry (pg_cron) | HIGH | MEDIUM | P2 |
| Real-time updates | MEDIUM | MEDIUM | P2 |
| Auto order completion | MEDIUM | LOW | P2 |
| Bonus mode toggle | MEDIUM | LOW | P2 |
| Match failure reasons | MEDIUM | LOW | P2 |
| Manual assignment | MEDIUM | LOW | P2 |
| Dark/light theme | LOW | LOW | P2 |
| Webhook delivery status UI | MEDIUM | LOW | P2 |
| Geo-based matching | MEDIUM | MEDIUM | P3 |
| Broker portal | LOW | HIGH | P3 |
| Billing integration | LOW | HIGH | P3 |
| Multi-user auth | LOW | MEDIUM | P3 |
| Lead quality analytics | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch. The system doesn't function without these.
- P2: Should have, add in fast-follow iterations. Improve reliability and UX.
- P3: Nice to have. Future consideration based on operational needs.

## Competitor Feature Analysis

| Feature | Boberdoo | LeadsPedia | CAKE | Lead Prosper | PPL Approach |
|---------|----------|------------|------|--------------|--------------|
| **Lead ingestion** | Web forms, API, ping/post | Web forms, ping/post, direct post | Multi-channel capture | Direct post, ping/post, email, SMS | Webhook only (from GHL). Simpler scope. |
| **Routing logic** | Priority, weighted, ping/post bidding, EPL, waterfall | Smart routing with algorithms, criteria-based | Round-robin, weighted price, buyer rank | Highest bidder, filters, campaign triggers | Weighted round-robin by leads_remaining. No bidding. |
| **Buyer/broker management** | Unlimited admin/vendor logins, filter sets per buyer | Buyer profiles with caps and budgets | Buyer profiles with scheduling and bids | Unlimited suppliers and buyers, buyer portal | Broker profiles with GHL URL. Admin-managed. |
| **Delivery caps** | Per filter set targets | Hourly, daily, weekly, monthly caps | Pre-defined buyer volumes | Per campaign limits | Per order: leads_purchased as total cap. |
| **Quality checking** | LeadQC scoring, source-level checks | Field validations, third-party integrations | Real-time validation and enrichment | TrustedForm, LeadID, Anura integrations | Credit score from GHL. No separate engine. |
| **Webhook delivery** | Custom SMTP, CRM integrations | Real-time delivery, CRM integrations | Automated delivery with scheduling | Direct post, webhooks, email, SMS | POST to broker GHL webhook URL. Single method. |
| **Retry/failover** | Waterfall distribution, re-billing | Delivery scheduling | Backup routing | Campaign triggers for secondary sources | pg_cron retry, 3 attempts, dead letter on failure. |
| **Unassigned handling** | Hold for manual review | Not explicitly documented | Not explicitly documented | Lead returns via CSV | Visible queue with match failure reasons. |
| **Reporting** | Premium dashboards, line-by-line tracking | Real-time analytics, ROI tracking | Closed-loop performance measurement | Real-time analytics, ROI tracking | Admin dashboard with KPIs, activity log, per-entity views. |
| **Audit trail** | Complete vendor/partner activity monitoring | Dynamic tracking | Buyer lead status updates | Complete lead lifecycle visibility | Full activity log of every event. |
| **Pricing model** | Enterprise SaaS | Enterprise SaaS | Enterprise SaaS | Per-lead pricing | Internal tool. No licensing cost. |
| **Multi-tenancy** | Yes (marketplace model) | Yes (network model) | Yes (advertiser/publisher model) | Yes (supplier/buyer model) | No. Single operator. Massive simplification. |

## Sources

- [Boberdoo Lead Distribution System](https://www.boberdoo.com/lead-distribution-system) - Feature set, quality checking, delivery, admin capabilities
- [Boberdoo Lead Distribution Logic](https://www.boberdoo.com/lead-distribution-logic) - Routing algorithms: priority, weighted, EPL, waterfall, ping/post
- [LeadsPedia Lead Distribution](https://www.leadspedia.com/lead-distribution.html) - Smart routing, geo-targeting, caps, delivery scheduling
- [CAKE Lead Distribution Software](https://getcake.com/lead-distribution-software/) - Routing, validation, buyer management, performance tracking
- [Lead Prosper](https://www.leadprosper.io/) - Real-time delivery, filters, dupe check, buyer portal, unlimited webhooks
- [LeanData Round Robin Best Practices](https://www.leandata.com/blog/round-robin-lead-distribution-best-practices/) - Weighted distribution, capacity management, availability routing
- [LeadAngel Best Lead Distribution Software 2026](https://www.leadangel.com/blog/operations/best-lead-distribution-software/) - Feature comparison across platforms
- [LeadAngel Speed to Lead Statistics](https://www.leadangel.com/blog/operations/speed-to-lead-statistics/) - Sub-10-second assignment benchmarks, 391% conversion increase at 1 minute
- [Svix Webhook Retry Best Practices](https://www.svix.com/resources/webhook-best-practices/retries/) - Exponential backoff, dead letter queues
- [Hookdeck Webhook Retry Guide](https://hookdeck.com/webhooks/guides/webhook-retry-best-practices) - 3-7 retries, jitter, failure handling
- [GoHighLevel Webhook Documentation](https://help.gohighlevel.com/support/solutions/articles/155000003305-workflow-action-custom-webhook) - Custom webhook actions, auth, payload configuration
- [Hatrio CRM Audit Trails](https://sales.hatrio.com/blog/what-are-crm-audit-trails/) - Digital logs for every action, change, and interaction

---
*Feature research for: Lead Distribution & Round-Robin Management*
*Researched: 2026-03-12*
