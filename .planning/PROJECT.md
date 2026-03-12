# PPL Lead Management

## What This Is

Internal admin tool for BadAAAS that receives incoming funding leads via webhook from GHL, matches them to brokers based on order criteria (vertical + credit score), distributes them using smart weighted rotation, and fires them off to each broker's GHL sub-account automatically. The whole assignment flow needs to happen in seconds because business owners are sitting on a thank you page waiting for an AI call.

## Core Value

Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail of why each assignment was made.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Inbound webhook endpoint receives lead data from GHL main sub-account
- [ ] Leads stored in database immediately on receipt
- [ ] Lead updates via PATCH endpoint matching on ghl_contact_id (for AI call notes arriving later)
- [ ] Broker profile management (name, company, email, phone, GHL webhook URL, status)
- [ ] Order management with criteria (vertical multi-select, credit score minimum, total leads purchased)
- [ ] Order controls: start, pause, resume, complete, bonus mode toggle
- [ ] Smart weighted rotation based on leads_remaining (bigger orders get proportionally more leads)
- [ ] Automatic order completion when leads_remaining hits 0 (unless bonus mode)
- [ ] Outbound webhook fires lead data to assigned broker's GHL webhook URL
- [ ] Async webhook retry with pg_cron (3 attempts, flag failures in dashboard)
- [ ] Unassigned queue for leads with no matching broker, with reason why not matched
- [ ] Manual lead assignment from unassigned queue
- [ ] Admin dashboard: overview with KPIs and activity feed
- [ ] Admin dashboard: leads table with filtering, search, and detail view
- [ ] Admin dashboard: brokers table with profile detail and lead history
- [ ] Admin dashboard: orders table with color-coded status and inline actions
- [ ] Admin dashboard: unassigned queue with match failure reasons
- [ ] Admin dashboard: activity log (all events, filterable)
- [ ] Real-time dashboard updates via Supabase Realtime
- [ ] Simple password auth with session cookie
- [ ] Dark/light theme toggle
- [ ] Atomic lead assignment with Postgres advisory locks (race condition prevention)

### Out of Scope

- State/geo-based matching criteria — deferred to future iteration
- Direct SMS/email notifications to brokers — GHL automations handle this
- Mobile-optimized UI — desktop-first admin tool
- Multi-user admin accounts — single shared password for now
- Broker self-service portal — admin-only for v1
- Payment/billing integration — orders are tracked manually

## Context

- This is the second app in the PPL ecosystem. PPL Onboarding (just shipped) handles broker onboarding flow with a 7-step wizard, collecting delivery preferences and syncing to GHL.
- The full lead flow: Meta/Google ads → landing page → opt-in + soft credit pull → GHL main account → webhook to THIS app → match + assign → webhook to broker's GHL sub-account → broker's automations notify them.
- Business owners wait ~2 minutes on a thank you page for an AI call after opt-in. Speed of assignment is critical.
- Each broker's GHL sub-account has a unique inbound webhook URL that accepts POST requests with lead data.
- AI call notes may arrive in the initial webhook or come as a follow-up update.
- The smart rotation logic is the core differentiator. It needs to be reliable, fast, and fully auditable.

## Constraints

- **Tech stack**: Next.js 16 + React 19 + Supabase + Vercel + ShadCN (consistent with ppl-onboarding)
- **Performance**: Lead assignment must complete in seconds (business owners are waiting)
- **Concurrency**: Postgres advisory locks for atomic lead assignment
- **Real-time**: Supabase Realtime subscriptions for live dashboard updates
- **Webhook retry**: Async via pg_cron, non-blocking (3 retries with delay)
- **Auth**: Simple password + session cookie (same as ppl-onboarding)
- **Deploy**: Vercel

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Mirror ppl-onboarding stack | Consistency across PPL ecosystem, team familiarity | — Pending |
| Postgres advisory locks for assignment | Fast, reliable, no table-level contention for concurrent leads | — Pending |
| Supabase Realtime for dashboard | Live updates without polling, native to our DB | — Pending |
| pg_cron for webhook retries | Non-blocking async retries, keeps inbound handler fast | — Pending |
| PATCH + ghl_contact_id for lead updates | Clean API, matches on GHL's unique identifier | — Pending |
| Weighted rotation by leads_remaining | Fair distribution proportional to order size, prevents starvation | — Pending |

---
*Last updated: 2026-03-12 after initialization*
