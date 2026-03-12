# Project Research Summary

**Project:** PPL Lead Management
**Domain:** Internal Lead Distribution & Round-Robin Management System (Pay-Per-Lead Vertical)
**Researched:** 2026-03-12
**Confidence:** HIGH

## Executive Summary

PPL Lead Management is a single-operator internal admin tool for routing leads from a GHL main account to broker GHL sub-accounts via weighted round-robin distribution. Unlike multi-tenant lead marketplaces (Boberdoo, LeadsPedia, CAKE), this system has a narrowly scoped mandate: receive leads via webhook, match them against active broker orders using vertical + credit score criteria, distribute proportionally by leads remaining, and deliver to brokers via outbound webhook. The research is unambiguous on the right approach: the entire matching and assignment logic must live as a single Postgres function with advisory locks. No application-level rotation state, no round-trips between TypeScript and SQL during assignment. This is the architectural loadbearing wall.

The recommended stack is tightly constrained by ecosystem alignment with ppl-onboarding: Next.js 16 on Vercel, Supabase (Postgres + Realtime + pg_cron + pg_net), ShadCN + Tailwind v4, TanStack Table, and nuqs for URL state. The delivery pipeline is the most opinionated stack decision: pg_net fires outbound webhooks asynchronously after transaction commit, pg_cron retries failures every 2 minutes, and the inbound handler returns 200 in under 2 seconds without blocking on delivery. This is non-negotiable given Vercel's serverless timeout constraints and GHL's expectation of fast responses.

The top risk is concurrent webhook handling. Two leads arriving within milliseconds can produce double assignments, rotation drift, or over-delivery to a single broker if the assignment function is not properly serialized with `pg_advisory_xact_lock(1, 0)`. This must be addressed in Phase 1, before any webhook code ships. Secondary risks are connection exhaustion on Vercel (use Supavisor port 6543 from day one) and webhook idempotency (unique constraint on `ghl_contact_id` + delivery ID). Every other pitfall is recoverable. These three are not.

## Key Findings

### Recommended Stack

The stack is fully determined by ecosystem constraints and has no ambiguous choices. Next.js 16 + React 19 + TypeScript 5 is the core. Supabase provides the database, auth-adjacent cookie sessions, realtime broadcast, pg_cron scheduled jobs, and pg_net async HTTP. ShadCN (Tailwind v4, Radix UI primitives) handles UI components. TanStack Table v8 powers all data tables. nuqs manages URL filter/sort state. Zod v3 (NOT v4) validates webhook payloads and forms. react-hook-form with @hookform/resolvers bridges forms to Zod schemas.

**Core technologies:**
- **Next.js 16 + React 19**: Full-stack framework, Server Components for dashboard shells, Server Actions for mutations, Route Handlers for webhook endpoints.
- **Supabase (Postgres + extensions)**: pg_advisory_xact_lock for race-free assignment, pg_net for async outbound webhooks, pg_cron for retry scheduling, Realtime Broadcast for live dashboard updates.
- **ShadCN + Tailwind v4**: UI components, no external dependency (copy-paste model), Radix UI accessibility primitives included.
- **TanStack Table v8**: Headless table engine for leads, brokers, orders, unassigned queue — all server-side sortable and filterable.
- **Zod v3 + react-hook-form**: Shared validation schemas across webhook handlers and admin forms. Zod v4 blocked by active resolver compatibility issues.
- **nuqs v2**: URL-synced filter/sort state for shareable filtered dashboard views.
- **Simple cookie auth**: bcrypt hash in env var + HttpOnly cookie + Next.js middleware. No Supabase Auth, no NextAuth. Explicitly scoped to single shared password.

**Critical version constraint:** Pin `zod` to `~3.24.0`. Do NOT upgrade to v4 until the @hookform/resolvers issue is resolved (tracked at github.com/react-hook-form/resolvers/issues/813).

### Expected Features

The system is a well-understood domain (internal lead routing), and the feature set is fully determined by what must exist for leads to flow from GHL to brokers. Competitor benchmarking (Boberdoo, LeadsPedia, CAKE, Lead Prosper) confirms the table stakes list and makes anti-feature choices clear.

**Must have (table stakes, v1):**
- Inbound webhook endpoint (GHL lead ingestion) + PATCH endpoint (AI call notes update)
- Lead storage with full GHL payload capture
- Broker profiles CRUD (name, company, GHL webhook URL, status)
- Order management with criteria (vertical multi-select, credit score min, lead cap) and full lifecycle (start/pause/resume/complete)
- Criteria matching + weighted round-robin distribution (proportional to leads_remaining)
- Atomic assignment with advisory locks (race condition prevention)
- Outbound webhook delivery to broker GHL sub-accounts
- Unassigned queue (visible, with match failure reasons)
- Admin dashboard with KPIs, leads table, brokers table, orders table, activity log
- Simple password auth

**Should have (v1.x fast-follow):**
- Webhook retry via pg_cron (3 attempts, exponential backoff with jitter)
- Real-time dashboard updates via Supabase Realtime Broadcast
- Auto order completion when leads_remaining hits 0
- Bonus mode toggle per order (continue receiving leads past cap)
- Manual assignment from unassigned queue
- Match failure reason per unassigned lead
- Webhook delivery status UI per lead

**Defer (v2+):**
- Geographic/state-based routing (explicitly out of scope per PROJECT.md)
- Broker self-service portal
- Payment/billing integration
- Multi-user admin with roles
- Lead quality analytics

**Anti-features to avoid entirely:** Ping/post bidding (unnecessary complexity for fixed-price model), lead deduplication engine (unique constraint on ghl_contact_id is sufficient), form builder (webhook-only ingestion), email/SMS broker notifications (GHL automations handle this), mobile-responsive admin (desktop-only tool).

### Architecture Approach

The architecture has four clean layers: Ingestion (Next.js Route Handlers), Assignment Engine (Postgres `assign_lead()` function), Delivery Layer (pg_net + pg_cron), and Presentation (Server Components + Realtime). The critical design principle is that the assignment engine lives entirely in SQL. The TypeScript layer validates and stores the lead, then calls `SELECT assign_lead(lead_id)` as a single RPC. All matching, rotation, decrement, logging, and delivery queuing happens inside that one transaction. After commit, a database trigger fires pg_net for async outbound delivery. A pg_cron job scans for failures every 2 minutes and retries with batching and jitter.

**Major components:**
1. **Inbound Webhook Handler** (`app/api/webhooks/inbound/route.ts`) — validates GHL payload via Zod, inserts lead, calls assign_lead() RPC, returns 200 in <2 seconds.
2. **Assignment Engine** (`supabase/migrations/` Postgres function) — advisory lock, criteria matching, weighted rotation, atomic assignment, event logging, webhook delivery queuing.
3. **Delivery Layer** (pg_net trigger + pg_cron retry scanner) — async outbound webhook fire, 3-attempt retry with exponential backoff + jitter, permanent failure after max retries.
4. **Dashboard** (Next.js App Router route group `(dashboard)/`) — SSR data fetch, Server Actions for mutations, RealtimeProvider for live updates.
5. **Realtime Provider** (`components/realtime/realtime-provider.tsx`) — Supabase Broadcast channel subscriber, distributes events to dashboard components via React context.
6. **Auth Guard** (`middleware.ts`) — session cookie check, redirects unauthenticated requests.

**Build order from architecture research:** Schema first, then assignment engine, then webhook layer, then dashboard, then realtime. Dashboard SSR + manual refresh works fine while realtime is added last.

### Critical Pitfalls

1. **Double lead assignment from concurrent webhooks** — Use `pg_advisory_xact_lock(1, 0)` as a global serializer inside `assign_lead()`. Add UNIQUE constraint on `(lead_id, broker_id)` as backstop. Must be in Phase 1, cannot be retrofitted.

2. **Synchronous business logic in webhook endpoint** — Webhook handler must return 200 in <2 seconds. Assignment RPC + pg_net are async after transaction commit. Never block the inbound handler on outbound delivery.

3. **Advisory lock ID collisions with Supabase internals** — Use two-integer form `pg_advisory_xact_lock(namespace, id)` where namespace is your own constant (1 for assignment, 2 for retry). Supabase GoTrue uses single-bigint form, so two-int form avoids collision.

4. **Supabase connection exhaustion on Vercel** — Always connect via Supavisor transaction mode (port 6543). Configure from day one. Known issue with connection growth on Vercel Fluid Compute if misconfigured.

5. **Retry storms exhausting pg_cron** — Batch retry scanner to process max 10 failures per cron execution. Add exponential backoff with jitter to `next_retry_at`. Prevents cascade when a broker endpoint recovers from downtime.

## Implications for Roadmap

Based on architecture's explicit build order dependency chain and pitfall phase mapping, the suggested phase structure is 5 phases:

### Phase 1: Foundation + Assignment Engine
**Rationale:** Everything depends on the database schema. The assignment logic (the hardest, most critical part) must be built and tested before any webhook code exists. All 6 Phase 1 pitfalls must be prevented here, and they cannot be retrofitted. This phase is the loadbearing foundation.
**Delivers:** Working Postgres schema, `assign_lead()` function with advisory locks, local dev environment, generated TypeScript types, simple auth.
**Addresses:** Lead storage, broker profiles, order management, assignment engine, advisory lock namespace, connection pooling configuration.
**Avoids:** Double assignment (advisory lock), lock collisions (namespace convention), connection exhaustion (Supavisor config), rotation drift (single-function atomicity).

### Phase 2: Webhook Layer
**Rationale:** With the assignment engine proven, wire up the inbound surface. GHL sends leads here. This is the system's external interface. Must be fast (<2s) and idempotent.
**Delivers:** Inbound webhook endpoint, lead update PATCH endpoint, webhook secret validation, payload normalization, integration with assign_lead() RPC.
**Addresses:** Inbound webhook, lead update (PATCH), webhook idempotency constraint.
**Avoids:** Synchronous webhook handler timeout, missing idempotency, PATCH-before-POST ordering.

### Phase 3: Delivery + Retry
**Rationale:** Leads are being assigned but not yet delivered. This phase closes the loop: outbound webhook to broker GHL sub-accounts, delivery tracking, and the retry mechanism. Once this works, the system can actually route leads end-to-end.
**Delivers:** pg_net outbound webhook trigger, webhook_deliveries table, pg_cron retry scanner with batching and jitter, permanent failure marking.
**Addresses:** Outbound webhook delivery, webhook retry, dead letter pattern.
**Avoids:** Retry storms (batch + jitter), silent failures (delivery status tracking), broker delivery failures going unnoticed.

### Phase 4: Admin Dashboard
**Rationale:** The assignment pipeline works end-to-end. Now build the admin visibility layer. All tables are populated with real data at this point, which makes dashboard development efficient.
**Delivers:** KPI overview page, leads table + detail views, brokers management, orders management with inline actions, unassigned queue + manual assignment, activity log.
**Addresses:** All admin UI table stakes (leads table, orders table, brokers table, unassigned queue, activity log, KPIs).
**Avoids:** Unassigned queue invisible (prominent KPI placement), activity log without filtering, order status changes without confirmation dialog.

### Phase 5: Realtime + Polish
**Rationale:** Dashboard SSR works fine with manual refresh. Realtime is enhancement, not foundation. Add it once the dashboard views are stable. Also covers bonus mode, auto-completion edge cases, match failure reasons, and theme toggle.
**Delivers:** Supabase Realtime Broadcast setup, database event triggers, RealtimeProvider component, live update handlers, bonus mode toggle, dark/light theme, UX polish.
**Addresses:** Real-time updates, auto order completion, bonus mode, match failure reason tracking, webhook delivery status UI.
**Avoids:** Polling antipattern (Broadcast vs setInterval), Realtime subscription without filters (cost and noise), stale dashboard after disconnect (reconnection handler).

### Phase Ordering Rationale

- Schema + engine before webhooks because the webhook handler calls the engine. Can't build the caller before the callee.
- Webhooks before dashboard because the dashboard displays data that only exists after webhooks are processed.
- Delivery before dashboard because the dashboard needs to show delivery status, which only exists after the delivery layer runs.
- Dashboard before realtime because Realtime pushes updates to UI components that must already exist.
- Advisory lock, connection pooling, and idempotency in Phase 1 because all three are impossible to retrofit safely once data flows through the system.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** pg_net trigger + pg_cron retry interaction has nuanced timing. The net._http_response table polling logic for retry detection needs careful implementation. The ARCHITECTURE.md example is a solid starting point but retry scanner edge cases (response timeout vs 4xx vs 5xx) need validation.
- **Phase 2:** GHL webhook payload schema is not formally documented and "can change without notice" per PITFALLS.md. Store raw jsonb alongside parsed fields. The defensive parsing pattern needs to be locked in before Phase 2 ships.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Postgres advisory locks + schema design are well-documented. The assign_lead() function is fully specified in ARCHITECTURE.md. Supavisor configuration is documented in official Vercel/Supabase guides.
- **Phase 4:** ShadCN + TanStack Table + nuqs dashboard patterns are extremely well-documented. Standard implementation. No novel integration.
- **Phase 5:** Supabase Realtime Broadcast pattern is documented and the RealtimeProvider pattern is specified in ARCHITECTURE.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs, versions confirmed active/stable, ecosystem constraints from ppl-onboarding explicitly honored. One known gotcha: zod v4 compatibility. |
| Features | HIGH | Competitor analysis across 5 major lead distribution platforms. Feature scope is tightly bounded by PROJECT.md constraints. Anti-feature list is well-reasoned. |
| Architecture | HIGH | Official Supabase docs for pg_net, pg_cron, Realtime. PostgreSQL docs for advisory locks. assign_lead() function is fully specified. Build order dependency chain is explicit. |
| Pitfalls | HIGH | Mix of official docs (Vercel timeouts, Supabase connection limits, RLS) and community-verified patterns. GoTrue advisory lock collision and Supavisor growth bug are MEDIUM (community reports, not reproduced internally). |

**Overall confidence:** HIGH

### Gaps to Address

- **GHL payload schema stability:** Store raw `jsonb` payload on every lead record. Parse defensively with Zod `.partial()` for optional fields. Validate this assumption with a real GHL test webhook during Phase 2.
- **Supavisor connection growth bug on Vercel Fluid Compute:** Monitor connection count after first Vercel deployment. If connections grow without releasing, switch from `attachDatabasePool` approach. Mitigation is well-understood (transaction mode port 6543) but the specific bug is community-reported, not officially resolved.
- **Advisory lock scope:** The research recommends `pg_advisory_xact_lock(1, 0)` as a global assignment serializer (all verticals queue through one lock). This is correct for fairness at current lead volumes. If per-vertical parallelism is needed later, lock granularity can be changed to `(1, hashtext(vertical))`. Document this decision in the first migration.
- **Zod v4 upgrade path:** Track github.com/react-hook-form/resolvers/issues/813. Once resolved, upgrade path is straightforward (zod v4 is largely compatible with v3 schemas).

## Sources

### Primary (HIGH confidence)
- Next.js 16 + 16.1 release blogs — framework features, Server Actions, Turbopack
- Supabase pg_net docs — async HTTP, 200 req/sec limit, at-most-once delivery
- Supabase pg_cron docs — scheduling, max concurrent jobs
- Supabase Realtime getting started + limits — Broadcast vs postgres_changes recommendation
- Supabase SSR package docs — server/browser client creation, cookie-based sessions
- Supabase Queues (pgmq) docs — guaranteed delivery, visibility timeouts
- PostgreSQL advisory locks official docs — transaction-scoped lock behavior
- Vercel function timeout docs — 10s free tier, 60s Pro tier
- Vercel connection pooling guide — Supavisor transaction mode requirement
- ShadCN Tailwind v4 docs — migration guide, CSS-first config
- ShadCN data table + chart docs — TanStack Table integration, Recharts usage
- Supabase RLS + API keys docs — security boundaries
- GoHighLevel webhook documentation — payload format, custom webhook actions

### Secondary (MEDIUM confidence)
- PostgreSQL advisory locks blog posts (flaviodelgrosso.com, rclayton.silvrback.com) — practical patterns
- Next.js App Router patterns 2026 (dev.to) — route groups, Server Actions conventions
- Supabase webhook retry community discussion (github.com/orgs/supabase) — pg_cron + pg_net retry pattern
- Supavisor connection growth issue (github.com/orgs/supabase/discussions/40671) — known bug, community-reported
- GoTrue advisory lock deadlocks (github.com/supabase/supabase-js/issues/1594) — known issue
- Webhook idempotency patterns (hookdeck.com) — implementation guidance
- Webhook retry best practices (svix.com, hookdeck.com) — exponential backoff, jitter, dead letter

### Tertiary (LOW confidence)
- Lead distribution systems overview (leadops.io) — domain patterns, hybrid routing

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
