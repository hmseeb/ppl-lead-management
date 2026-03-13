# PPL Lead Management

## What This Is

Internal admin tool for BadAAAS that receives incoming funding leads via webhook from GHL, matches them to brokers based on order criteria (vertical + credit score), distributes them using smart weighted rotation, and fires them off to each broker's GHL sub-account automatically. Includes real-time delivery monitoring, failure alerts, and daily digest summaries.

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

### Active

(None — planning next milestone)

### Out of Scope

| Feature | Reason |
|---------|--------|
| State/geo-based matching criteria | Deferred to future iteration |
| Mobile-optimized UI | Desktop-first admin tool |
| Multi-user admin accounts | Single shared password for now |
| Broker self-service portal | Admin-only for current scope |
| Payment/billing integration | Orders tracked manually |
| Historical delivery analytics with date range | Dashboard is for today's health |
| Per-broker delivery stats on main dashboard | Visible on broker detail pages |
| Configurable alert channels (Slack, email, push) | One admin, one channel (GHL SMS) |
| Alert severity levels / acknowledgement / escalation | One-person operation |
| Weekly/monthly roll-up digests | Defer until operational patterns emerge |

## Context

- **Current state:** v1.0 + v1.1 shipped. 9 phases, 19 plans, ~8,000 LOC TypeScript.
- **Tech stack:** Next.js 16, React 19, Supabase (Postgres, Realtime, Edge Functions, Vault, pg_cron, pg_net), Vercel, ShadCN, GHL Conversations API.
- **Ecosystem:** Second app in PPL suite. PPL Onboarding handles broker onboarding with 7-step wizard and GHL sync.
- **Lead flow:** Meta/Google ads → landing page → opt-in + soft credit pull → GHL main account → webhook to THIS app → match + assign → delivery to broker's GHL sub-account → broker automations.
- **Infrastructure:** 4 Supabase edge functions (deliver-ghl, send-alert, send-digest, plus webhook handler), 4 pg_cron jobs (retry webhooks, retry channels, cleanup alert state, daily digest).

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
| Weighted rotation by leads_remaining | Fair distribution proportional to order size | ✓ Good |
| DB triggers + pg_net for alerts | No application-level hooks needed, fires from DB events directly | ✓ Good |
| Alert dedup via alert_state table | 15-min window prevents SMS storms from batch failures | ✓ Good |
| Single send-alert with type discriminator | One edge function serves both alert types, extensible | ✓ Good |
| pg_cron UTC for daily digest | Accept 1hr DST drift for simplicity (8 AM PST / 9 AM PDT) | ✓ Good |
| Edge function self-queries for digest stats | Simpler than pre-computing in SQL, 12 parallel counts | ✓ Good |
| SECURITY DEFINER for alert triggers | Bypasses RLS on alert_state without write policies for anon | ✓ Good |
| 500ms debounce + 2s max wait for Realtime | Balances responsiveness vs efficiency for batch events | ✓ Good |

---
*Last updated: 2026-03-13 after v1.1 milestone*
