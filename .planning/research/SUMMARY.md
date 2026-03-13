# Project Research Summary

**Project:** PPL Lead Management
**Domain:** Monitoring, Alerting & Daily Digest for Lead Distribution System (v1.1 Milestone)
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

This milestone adds a monitoring and alerting layer on top of an already-functional lead distribution system. The existing infrastructure (Supabase with pg_cron, pg_net, Realtime, GHL Conversations API, activity_log, deliveries table) provides nearly all the building blocks needed. The v1.1 scope is four features: delivery stats dashboard, failure alerts (SMS), unassigned lead alerts (SMS), and a daily digest (email + SMS). All four are independent of each other, meaning they can be built in any order. The total new code footprint is small: one npm package (`@date-fns/tz`), one ShadCN component (`chart`), two Supabase Edge Functions, one SQL migration file with triggers and a cron job, and a handful of UI components.

The recommended approach is event-driven: DB triggers on existing tables fire pg_net calls to a single reusable `send-alert` edge function. This avoids modifying any core assignment or delivery logic. The daily digest uses a pg_cron scheduled edge function. The dashboard stats are server-rendered queries refreshed via the already-wired Realtime listener. The architecture is deliberately thin. No new queuing systems, no new notification providers, no new state management.

The primary risk is alert storms. When a broker's endpoint goes down, correlated failures produce dozens of `failed_permanent` events simultaneously, each firing an SMS alert. This exhausts the admin's patience AND the shared GHL API rate limit (100 req/10s), potentially blocking actual lead deliveries. This must be solved with alert deduplication/throttling BEFORE shipping alert triggers. Secondary risks include pg_cron's UTC-only scheduling (manageable with fixed UTC offset) and Realtime refresh storms during batch lead processing (fixable with debouncing).

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, React 19, Supabase, ShadCN, recharts, date-fns v4, iron-session) requires almost no additions. The v1.1 milestone needs exactly one new npm dependency and one new ShadCN component. Everything else is Supabase-side infrastructure (SQL migrations, edge functions, pg_cron jobs).

**Core additions:**
- `@date-fns/tz` (^1.4.1): Pacific Time calculations for daily digest scheduling. Official companion to date-fns v4, provides `TZDate` class. 761 bytes.
- ShadCN `chart` component: Theme-aware recharts wrapper (`ChartContainer`, `ChartTooltip`). Zero runtime dependencies, just copied component files. New stats charts should use this instead of manual theme handling.
- Two Supabase Edge Functions (`send-alert`, `daily-digest`): Deno runtime, no npm packages needed. Use `@supabase/supabase-js@2` via esm.sh (same pattern as existing `deliver-ghl`).
- `admin_settings` table: Single-row config table for admin alert preferences. Enforced by unique index on `((true))`.
- `delivery_stats_today` view: Query convenience for dashboard stats. Server components use it, Realtime refreshes it indirectly.

**Explicitly not adding:** Resend/SendGrid/Twilio (already using GHL), Supabase Queues/pgmq (overkill for alert volume), node-cron (pg_cron handles scheduling), additional toast libraries (Sonner already installed).

### Expected Features

**Must have (table stakes):**
- Today's delivery counts (total, sent, failed, by channel) on the dashboard
- Real-time stat updates via existing Supabase Realtime
- SMS alert on `failed_permanent` with lead name, broker name, channel, and error
- SMS alert on unassigned lead with lead details and match failure reason
- Daily digest at 8 AM Pacific via email (detailed) and SMS (summary)
- Admin GHL contact ID configuration (stored in Vault)

**Should have (differentiators for v1.1.x):**
- Alert deduplication/throttling (prevents SMS spam from correlated failures)
- Channel health indicators (color-coded green/yellow/red per delivery channel)
- Delivery success rate percentage
- Failed deliveries list with error details for quick triage
- Deep links in SMS alerts to relevant dashboard pages

**Defer (v1.2+):**
- Historical delivery analytics with date range picker
- Delivery latency metrics
- Configurable alert channels (Slack, email, push)
- Per-broker delivery stats breakdown
- Weekly/monthly roll-up digests
- Alert acknowledgement/escalation systems

### Architecture Approach

The v1.1 layer sits entirely downstream of existing logic. No core functions (`assign_lead`, `process_webhook_retries`, `fire_outbound_webhook`) are modified. Monitoring hooks into outputs, not internals. The pattern is: DB event -> trigger -> pg_net -> edge function -> GHL API. A single `send-alert` edge function serves both failure and unassigned alerts via a `type` discriminator. The daily digest is a separate edge function because it needs to query and aggregate before sending. The dashboard stats component plugs into the existing server component data fetching pattern and gets free Realtime updates.

**Major components:**
1. `send-alert` edge function -- Generic alert sender. Receives alert type + payload, formats SMS body, sends via GHL Conversations API to admin contact.
2. `daily-digest` edge function -- Queries last 24h stats from Supabase, builds HTML email + compact SMS, sends both via GHL.
3. DB triggers (`trg_alert_delivery_failed`, `trg_alert_unassigned_lead`) -- Fire on `deliveries` UPDATE to `failed_permanent` and `unassigned_queue` INSERT. Route through pg_net to `send-alert`.
4. `<DeliveryStats />` component + `fetchDeliveryStats()` query -- Server-rendered KPI cards for today's delivery metrics. Refreshed by existing Realtime listener.
5. `admin_settings` table -- Single-row config for admin alert preferences and GHL contact ID.

### Critical Pitfalls

1. **Alert storm from batch failures** -- When a broker's endpoint goes down, 10-50 deliveries fail simultaneously, each firing an SMS. Prevent with per-broker debounce (15-minute window), batch summaries, and a cap of 5 alert SMS per hour.
2. **GHL API rate limit exhaustion** -- Alert SMS shares the same 100 req/10s budget as lead delivery SMS/email. A 429 response on alerts can cascade into more failures and more alerts. Prevent by never treating 429 as permanent failure, reading `X-RateLimit-Remaining`, and prioritizing lead delivery over alerts.
3. **Trigger cascade / infinite loop** -- New trigger on `deliveries` UPDATE can cascade through existing triggers and Realtime listeners. Prevent with `WHEN` clause on trigger definition (not inside function), never updating the triggering row from the alert handler, and tracking alert state in a separate table.
4. **pg_cron UTC-only scheduling** -- pg_cron on Supabase cannot be configured for local timezones. Schedule daily digest at `0 16 * * *` UTC (= 8 AM PST / 9 AM PDT). Accept the 1-hour DST drift for a non-urgent morning summary.
5. **Realtime refresh storm** -- Batch lead arrivals create 20-30 delivery rows, each emitting a Realtime event that triggers `router.refresh()`. Prevent by debouncing refresh calls (500ms window, 2s max wait) and filtering Realtime subscriptions to relevant status transitions.

## Implications for Roadmap

Based on research, the suggested phase structure follows the dependency graph: shared infrastructure first, then high-value alerting features, then visual dashboard, then the more complex scheduled digest.

### Phase 1: Alert Foundation
**Rationale:** Both failure alerts and unassigned alerts depend on the `send-alert` edge function and admin contact ID configuration. Build the shared pipeline first and validate that GHL SMS delivery works before wiring up triggers.
**Delivers:** `send-alert` edge function, `admin_settings` table, Vault secret for admin contact ID, alert deduplication mechanism (`alert_state` table with cleanup cron).
**Addresses:** Admin GHL contact ID config (P1 blocker), alert throttling infrastructure.
**Avoids:** Alert storm pitfall by building deduplication BEFORE triggers. GHL rate limit pitfall by adding 429 handling to edge function from day one.

### Phase 2: Real-time Alerts
**Rationale:** Highest operational value. Admin learns about failures and unassigned leads immediately instead of discovering them hours later on the dashboard. Depends on Phase 1's `send-alert` function.
**Delivers:** `trg_alert_delivery_failed` trigger on `deliveries` table, `trg_alert_unassigned_lead` trigger on `unassigned_queue`, SMS alerts to admin with contextual details.
**Addresses:** Failure alert SMS (P1), unassigned lead alert SMS (P1).
**Avoids:** Trigger cascade pitfall by using `WHEN` clause and separate alert state table. GHL rate limit pitfall by debouncing per-broker.

### Phase 3: Delivery Stats Dashboard
**Rationale:** Purely additive UI work with no backend dependencies. Builds on existing data and existing Realtime wiring. Lower urgency than alerts because the admin can already see delivery status on individual lead/broker pages.
**Delivers:** `fetchDeliveryStats()` query, `<DeliveryStats />` component with KPI cards, channel health indicators, `delivery_stats_today` view.
**Addresses:** Today's delivery counts (P1), real-time stats refresh (P1), channel health indicators (P1), delivery success rate (P2).
**Avoids:** Realtime refresh storm pitfall by adding debounce to `RealtimeListener` before wiring new stats components.

### Phase 4: Daily Digest
**Rationale:** Most complex feature (new edge function, pg_cron job, HTML email template, timezone handling). Benefits from having Phases 1-3 deployed and validated first. The Vault config and GHL contact ID are already proven by alert features. Least urgent because the dashboard and alerts already cover real-time monitoring.
**Delivers:** `daily-digest` edge function, pg_cron schedule at `0 16 * * *` UTC, HTML email + SMS summary, `digest_runs` tracking table.
**Addresses:** Daily digest email + SMS (P1).
**Avoids:** pg_cron UTC pitfall by using fixed UTC offset with documented DST behavior. Unbounded query pitfall by tracking last digest run timestamp. Edge function timeout pitfall by pre-computing stats in Postgres.

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Triggers without the alert sender are useless. The deduplication mechanism must exist before triggers fire to prevent alert storms from day one.
- **Phase 2 before Phase 3:** Alerts deliver more operational value than a dashboard. The admin finds out about problems within seconds via SMS instead of having to check a webpage.
- **Phase 3 before Phase 4:** The dashboard is simpler to build and test (pure frontend + query, no scheduling). Getting it live early gives the admin visibility while the digest is being built.
- **Phase 4 last:** Depends on scheduling infrastructure that's harder to test (must wait for cron to fire). Benefits from validated Vault config and GHL integration proven by earlier phases.
- **All phases avoid modifying core logic:** No changes to `assign_lead()`, `process_webhook_retries()`, `fire_outbound_webhook()`, or `fire_ghl_delivery()`.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Real-time Alerts):** Needs careful mapping of all existing triggers on `deliveries` and `unassigned_queue` tables before adding new ones. The cascade graph must be drawn out to verify no infinite loops. Worth running `/gsd:research-phase`.
- **Phase 4 (Daily Digest):** The HTML email template needs design decisions (what sections, what layout). The `digest_runs` tracking table adds state management. DST handling should be validated. Worth running `/gsd:research-phase`.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Alert Foundation):** Well-documented Supabase patterns (edge functions, Vault, admin config tables). The `send-alert` function mirrors the existing `deliver-ghl` function.
- **Phase 3 (Delivery Stats Dashboard):** Standard ShadCN + server component + Supabase query pattern. Identical to existing dashboard code. Just new queries and components.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Nearly zero new dependencies. `@date-fns/tz` is the official date-fns companion. ShadCN chart is well-documented. All verified against official docs. |
| Features | HIGH | Feature landscape is narrow (4 features, all well-scoped). Industry comparisons (Hookdeck, HubSpot, LeadCenter) validate the table stakes. Anti-features are clearly identified. |
| Architecture | HIGH | All patterns already exist in the codebase (`deliver-ghl` edge function, pg_cron jobs, Vault secrets, Realtime subscriptions). v1.1 replicates proven patterns. |
| Pitfalls | HIGH | Critical pitfalls verified against Supabase official docs, GHL API docs, and actual codebase analysis. Alert storm and rate limit pitfalls are based on how `process_webhook_retries()` actually works (verified in migration 00011). |

**Overall confidence:** HIGH

### Gaps to Address

- **GHL rate limit behavior under load:** The 100 req/10s limit is documented, but real-world enforcement (hard cutoff vs graceful degradation) is not well-documented for PIT tokens. Test empirically during Phase 1 by monitoring `X-RateLimit-Remaining` headers.
- **RealtimeListener debounce impact:** The current listener has no debouncing. Adding it might affect existing features (lead list updates, activity feed). Test the debounce threshold (500ms) against the existing dashboard experience before deploying.
- **Admin GHL contact creation:** The admin must exist as a contact in GHL to receive SMS/email. The research assumes this contact exists. Verify during Phase 1 setup that the contact ID is valid and SMS-capable.
- **FEATURES.md trigger mechanism disagreement:** FEATURES.md recommends application-level hooks (Option B), while ARCHITECTURE.md and STACK.md recommend DB triggers (Option A). ARCHITECTURE.md's approach is more robust (triggers fire regardless of code path) and aligns with existing patterns in the codebase. **Recommendation: use DB triggers** (ARCHITECTURE.md approach).

## Sources

### Primary (HIGH confidence)
- [Supabase Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) -- pg_cron + pg_net patterns
- [Supabase Cron Docs](https://supabase.com/docs/guides/cron) -- Scheduling, UTC behavior
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) -- Cold start times, limits
- [Supabase Vault Docs](https://supabase.com/docs/guides/database/vault) -- Secret storage patterns
- [Supabase Realtime postgres_changes](https://supabase.com/docs/guides/realtime/postgres-changes) -- Subscription patterns
- [date-fns v4 timezone docs](https://date-fns.org/v4.0.0/docs/Time-Zones) -- TZDate, @date-fns/tz usage
- [ShadCN Chart component](https://ui.shadcn.com/docs/components/radix/chart) -- ChartContainer, ChartConfig
- [pg_cron GitHub - Timezone Issue #16](https://github.com/citusdata/pg_cron/issues/16) -- UTC-only confirmed
- Existing codebase analysis (migrations 00008, 00010, 00011; realtime-listener.tsx; deliver-ghl/index.ts; ghl/client.ts)

### Secondary (MEDIUM confidence)
- [GoHighLevel API Rate Limits](https://help.gohighlevel.com/support/solutions/articles/48001060529) -- 100 req/10s burst, 200K/day
- [GHL Conversations API](https://marketplace.gohighlevel.com/docs/ghl/conversations/) -- SMS/Email sending patterns
- [HubSpot Daily Digest](https://yourhubspotexpert.com/boost-productivity-with-hubspots-sales-workspace-daily-digest-email/) -- Digest format patterns
- [Hookdeck Webhook Monitoring](https://hookdeck.com/webhooks/guides/monitoring) -- Failure rate monitoring patterns
- [Alert Fatigue Best Practices - OneUpTime](https://oneuptime.com/blog/post/2026-02-20-monitoring-alerting-best-practices/view) -- Deduplication patterns
- [Alert Deduplication - Atlassian Opsgenie](https://support.atlassian.com/opsgenie/docs/what-is-alert-de-duplication/) -- Industry standard patterns

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
