# PPL Lead Management

## What This Is

Internal admin tool for BadAAAS that receives incoming funding leads via webhook from GHL, scores them against all eligible orders using a 0-100 point algorithm, assigns them to the best-fit broker, and delivers them to each broker's GHL sub-account automatically. Includes pre-flight validation, credit tier gating, full routing audit trail, real-time delivery monitoring, failure alerts, daily digest summaries, and a filterable analytics dashboard with comparison mode.

## Core Value

Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail of why each assignment was made.

## Requirements

### Validated

- ✓ Inbound webhook endpoint receives lead data from GHL main sub-account — v1.0
- ✓ Leads stored in database immediately on receipt — v1.0
- ✓ Lead updates via PATCH endpoint matching on ghl_contact_id — v1.0
- ✓ Broker profile management (name, company, email, phone, GHL webhook URL, status) — v1.0
- ✓ Order management with criteria (vertical multi-select, credit score minimum, total leads purchased) — v1.0
- ✓ Order controls: start, pause, resume, complete, bonus mode toggle — v1.0
- ✓ Smart weighted rotation based on leads_remaining — v1.0
- ✓ Automatic order completion when leads_remaining hits 0 (unless bonus mode) — v1.0
- ✓ Outbound webhook fires lead data to assigned broker's GHL webhook URL — v1.0
- ✓ Async webhook retry with pg_cron (3 attempts, flag failures in dashboard) — v1.0
- ✓ Unassigned queue for leads with no matching broker, with reason why not matched — v1.0
- ✓ Manual lead assignment from unassigned queue — v1.0
- ✓ Admin dashboard: overview with KPIs and activity feed — v1.0
- ✓ Admin dashboard: leads, brokers, orders, unassigned queue, activity log tables — v1.0
- ✓ Real-time dashboard updates via Supabase Realtime — v1.0
- ✓ Simple password auth with session cookie — v1.0
- ✓ Dark/light theme toggle — v1.0
- ✓ Atomic lead assignment with Postgres advisory locks — v1.0
- ✓ Multi-channel delivery (webhook, email, SMS) via GHL Conversations API — v1.0
- ✓ Delivery stats dashboard with channel health indicators — v1.1
- ✓ Real-time SMS alerts for delivery failures and unassigned leads — v1.1
- ✓ Alert deduplication (15-min window per broker/lead) — v1.1
- ✓ Daily digest at 8 AM Pacific via pg_cron with HTML email + SMS — v1.1
- ✓ Delivery respects broker contact hours (business_hours 9-5, custom range, anytime) — v1.2
- ✓ Delivery paused on weekends when broker has weekend_pause enabled — v1.2
- ✓ Per-broker timezone support (default America/Los_Angeles) — v1.2
- ✓ Out-of-hours deliveries queued and released when broker's window opens — v1.2
- ✓ Admin visibility into queued/delayed deliveries — v1.2
- ✓ Pre-flight lead rejection (credit < 600, invalid loan amount, no active orders) — v2.0
- ✓ Scoring-based assignment engine (0-100 pts: credit fit, capacity, tier match, loan fit, bonuses) — v2.0
- ✓ Credit tier gating (680-tier orders never receive leads below 680) — v2.0
- ✓ Loan amount range filtering on orders (loan_min, loan_max) — v2.0
- ✓ Routing logs table with per-order scoring audit trail — v2.0
- ✓ Broker priority support (high/normal with scoring bonus) — v2.0
- ✓ Lead deduplication on email + phone (in addition to ghl_contact_id) — v2.0
- ✓ Monthly cap reset option on orders — v2.0
- ✓ Dashboard date range filters with presets (today, 7d, 30d, 90d, custom) — v2.1
- ✓ Dashboard broker filter scoping all KPIs to a single broker — v2.1
- ✓ Dashboard vertical filter scoping KPIs by lead vertical — v2.1
- ✓ Comparison mode showing delta badges vs previous period — v2.1
- ✓ URL-persisted dashboard filters using nuqs — v2.1
- ✓ Lead volume chart adapts range to selected date filter — v2.1
- ✓ Auto-reassign unassigned leads when matching orders become available — v2.1

### Active

- [ ] Broker portal at /portal/* with magic link auth (passwordless)
- [ ] Broker dashboard: active orders, recent leads, spend summary, delivery health
- [ ] Broker order creation with Stripe Checkout payment
- [ ] Admin pricing table management (vertical x credit tier = price per lead)
- [ ] Broker self-service: pause/resume orders, update webhook/delivery prefs, contact hours
- [ ] Broker lead visibility: their assigned leads with delivery status
- [ ] Broker spend history with Stripe receipts
- [ ] Strict data isolation (broker sees only their own data)

### Out of Scope

| Feature | Reason |
|---------|--------|
| State/geo-based matching criteria | Deferred to future iteration |
| Mobile-optimized UI | Desktop-first admin tool |
| Multi-user admin accounts | Single shared password for now |
| Broker self-service portal | Admin-only for current scope |
| Payment/billing integration | Orders tracked manually |
| Configurable alert channels (Slack, email, push) | One admin, one channel (GHL SMS) |
| Alert severity levels / acknowledgement / escalation | One-person operation |
| Weekly/monthly roll-up digests | Defer until operational patterns emerge |
| Multi-broker filter on dashboard | Single-select sufficient for broker scorecard |
| Exportable reports (CSV/PDF) | Defer until reporting needs emerge |

## Context

- **Current state:** v2.1 shipped. 21 phases, 37 plans, ~12,700 LOC TypeScript.
- **Tech stack:** Next.js 16, React 19, Supabase (Postgres, Realtime, Edge Functions, Vault, pg_cron, pg_net), Vercel, ShadCN, GHL Conversations API, nuqs, recharts.
- **Ecosystem:** Second app in PPL suite. PPL Onboarding handles broker onboarding with 7-step wizard and GHL sync.
- **Lead flow:** Meta/Google ads → landing page → opt-in + soft credit pull → GHL main account → webhook to THIS app → pre-flight validation → score against eligible orders → assign to best-fit → delivery to broker's GHL sub-account → broker automations.
- **Infrastructure:** 4 Supabase edge functions (deliver-ghl, send-alert, send-digest, plus webhook handler), 5 pg_cron jobs (retry webhooks, retry channels, cleanup alert state, daily digest, monthly order reset).

## Constraints

- **Tech stack**: Next.js 16 + React 19 + Supabase + Vercel + ShadCN (consistent with ppl-onboarding)
- **Performance**: Lead assignment must complete in seconds (business owners are waiting)
- **Concurrency**: Postgres advisory locks for atomic lead assignment
- **Real-time**: Supabase Realtime subscriptions for live dashboard updates
- **Webhook retry**: Async via pg_cron, non-blocking (3 retries with delay)
- **Auth**: Simple password + session cookie (same as ppl-onboarding)
- **Deploy**: Vercel (frontend), Supabase (backend + edge functions)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Mirror ppl-onboarding stack | Consistency across PPL ecosystem, team familiarity | ✓ Good |
| Postgres advisory locks for assignment | Fast, reliable, no table-level contention | ✓ Good |
| Supabase Realtime for dashboard | Live updates without polling, native to DB | ✓ Good |
| pg_cron for webhook retries | Non-blocking async retries, keeps inbound handler fast | ✓ Good |
| PATCH + ghl_contact_id for lead updates | Clean API, matches on GHL's unique identifier | ✓ Good |
| Weighted rotation by leads_remaining | Fair distribution proportional to order size | ✓ Good (superseded by scoring in v2.0) |
| DB triggers + pg_net for alerts | No application-level hooks needed, fires from DB events directly | ✓ Good |
| Alert dedup via alert_state table | 15-min window prevents SMS storms from batch failures | ✓ Good |
| Single send-alert with type discriminator | One edge function serves both alert types, extensible | ✓ Good |
| pg_cron UTC for daily digest | Accept 1hr DST drift for simplicity (8 AM PST / 9 AM PDT) | ✓ Good |
| Edge function self-queries for digest stats | Simpler than pre-computing in SQL, 12 parallel counts | ✓ Good |
| SECURITY DEFINER for alert triggers | Bypasses RLS on alert_state without write policies for anon | ✓ Good |
| 500ms debounce + 2s max wait for Realtime | Balances responsiveness vs efficiency for batch events | ✓ Good |
| Pure TypeScript scoring (not SQL) | Testable with unit tests, easier to debug than PL/pgSQL | ✓ Good |
| Order-based routing (not broker-centric) | Dan confirmed order architecture stays, spec adapted | ✓ Good |
| TDD for scoring engine | 30 tests covering all 12 scoring requirements, caught edge cases | ✓ Good |
| Hard credit tier filters before scoring | Prevents invalid assignments regardless of score | ✓ Good |
| nuqs for dashboard URL state | Consistent with leads page, server-side refetch on change | ✓ Good |
| Fire-and-forget auto-reassignment | Never blocks order action response, async processing | ✓ Good |
| Inner join for delivery vertical filtering | Deliveries lack vertical column, join through leads table | ✓ Good |

---
## Current Milestone: v3.0 Broker Portal

**Goal:** Build a broker-facing portal where brokers can create and manage their own orders, pay for leads via Stripe, and monitor their delivery health. Same app, /portal/* routes.

**Target features:**
- Magic link auth for brokers (email-based, passwordless)
- Broker dashboard with active orders, recent leads, spend, delivery health
- Order creation with Stripe Checkout (tiered pricing by vertical x credit tier)
- Admin pricing table in Settings
- Broker self-service: pause/resume orders, update delivery preferences
- Broker lead list with delivery status
- Spend history with Stripe receipts
- Strict broker data isolation

---
*Last updated: 2026-03-17 after v3.0 milestone start*
