# Feature Research

**Domain:** Monitoring, Alerting & Daily Digest for Lead Distribution (v1.1 Milestone)
**Researched:** 2026-03-13
**Confidence:** HIGH

This research maps the feature landscape for four specific capabilities being added to an existing lead management tool: delivery stats dashboard, failure alerts, daily digest, and unassigned lead alerts. All four build on existing infrastructure (deliveries table, GHL client, Supabase Realtime, pg_cron, activity_log).

## Feature 1: Delivery Stats Dashboard

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Today's lead count** | Admin needs the most basic "how many leads came in today" number. Every CRM dashboard starts here. | LOW | Already exists via `fetchKpis()` in `dashboard.ts`. Reuse or extend. |
| **Assigned vs unassigned counts (today)** | Admin needs to know what percentage of today's leads were successfully matched. Split view is standard in every distribution dashboard. | LOW | Already exists as total counts. Need to add today-scoped variant. Filter `leads` where `created_at >= today AND status = 'assigned'` vs `'unassigned'`. |
| **Delivered count by channel** | Multi-channel delivery (webhook, email, SMS) means the admin needs to see delivery volume per channel. Boberdoo and LeadsPedia both break down delivery stats by method. | LOW | Query `deliveries` table grouped by `channel` where `status = 'sent'` and `created_at >= today`. Three numbers. |
| **Failed delivery count** | The single most critical health metric. If failures spike, the system is broken. Every webhook monitoring tool (Hookdeck, Svix, Latenode) shows failure counts front and center. | LOW | Query `deliveries` where `status IN ('failed', 'failed_permanent')` and `created_at >= today`. |
| **Real-time updates** | Stats must update live as new leads arrive and deliveries complete. The existing dashboard already uses Supabase Realtime to refresh on changes to `leads`, `deliveries`, and `unassigned_queue`. | LOW | Already wired. `RealtimeListener` triggers `router.refresh()` on `deliveries` table changes. New stats components will auto-refresh. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Channel health indicators** | Color-coded status per channel (green = all sent, yellow = some failed, red = all failed). Gives instant visual read on which delivery method is having trouble. More useful than raw numbers. | LOW | Derive from counts: green if failed = 0, yellow if failed > 0 but sent > 0, red if sent = 0 and failed > 0. |
| **Delivery success rate percentage** | "95% delivery rate" is more meaningful than "190 sent, 10 failed." Hookdeck and Svix dashboards lead with success rates. | LOW | Math: `sent / (sent + failed + failed_permanent) * 100`. Display as percentage with color coding. |
| **Failed deliveries list with error details** | Clickable list of today's failures showing broker name, channel, error message, retry count. Turns a scary red number into actionable items. | MEDIUM | Join `deliveries` to `brokers` and `leads`. Filter by failed status. Show in expandable section or modal. |
| **Sparkline or mini-chart for lead volume** | Existing 7-day volume chart covers history. A small sparkline showing hourly volume for today gives a sense of current pace. | MEDIUM | Query leads grouped by hour for today. Use a simple bar or area chart. Nice-to-have, defer if scope is tight. |
| **Delivery latency metrics** | Time between `leads.created_at` and `deliveries.sent_at`. Shows how fast the system is working. Critical given the "business owner waiting on thank-you page" context. | MEDIUM | Compute `avg(deliveries.sent_at - leads.created_at)` for today. Display as "avg delivery time: 1.2s." |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Historical delivery analytics with date range picker** | "Show me last month's stats" seems useful. | Adds query complexity, chart libraries, date picker UI. The v1.1 goal is today's health, not historical analysis. Activity log already provides historical browsing. | Ship today-only stats. Add date range in v1.2 if the admin actually asks for it. |
| **Per-broker delivery stats breakdown** | "Show me how each broker's deliveries are doing" seems like a natural drill-down. | Multiplies the dashboard surface area. Each broker's delivery history is already visible on their detail page. Duplicating it on the main dashboard adds complexity without new information. | Link failed deliveries to broker detail pages. The broker detail page already shows their leads. |
| **Delivery performance comparison charts** | Side-by-side comparison of channels over time. Sounds like a "real" monitoring dashboard. | This is an internal admin tool with one user, not a Datadog instance. Building comparison charts is engineering theater for this use case. | Single success rate number per channel. If one is broken, the admin will see it. |

---

## Feature 2: Failure Alerts (GHL SMS to Admin)

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **SMS alert on `failed_permanent`** | The whole point. When a delivery exhausts all 3 retries, the admin needs to know immediately. Every monitoring system (Hookdeck, UptimeRobot, Datadog) sends alerts on permanent failure. | LOW | The `process_webhook_retries()` function already marks `failed_permanent` and inserts into `activity_log`. Hook into this event. Send SMS via existing `sendSms()` in the GHL client. |
| **Alert includes lead name and broker name** | A bare "delivery failed" SMS is useless. Admin needs to know WHICH lead and WHICH broker so they can take action. Standard in all alerting systems. | LOW | The `activity_log` entry for `delivery_failed_permanent` already contains `lead_id`, `broker_id`, and `details` with channel and error. Resolve names for the SMS body. |
| **Alert includes failure channel and error** | "SMS to John Smith for Broker XYZ failed: HTTP 429 rate limited" is actionable. "Something failed" is not. | LOW | Already in the `activity_log.details` JSONB. Extract `channel` and `error_message` for the SMS. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Alert deduplication / throttling** | If 10 deliveries fail in 1 minute (e.g., broker's webhook URL is down), don't send 10 SMS. Send one summary. Hookdeck groups related failures. | MEDIUM | Track last alert time. If another failure arrives within N minutes for the same broker, batch them. Could use a simple `last_alert_sent_at` column or in-memory check. Worth doing at MVP because broker URL outages cause cascading failures. |
| **Alert includes retry history** | "Failed after 3 retries over 7 minutes" gives context about persistence of the problem vs a fluke. | LOW | Already tracked: `retry_count` and timing from delivery record. Include in SMS body. |
| **Deep link to dashboard** | SMS contains a URL to the lead detail page or deliveries view so admin can jump straight to investigating. | LOW | Append `https://[app-url]/leads/[lead-id]` to the SMS. Trivial. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Configurable alert channels (Slack, email, push)** | "What if the admin wants Slack instead of SMS?" | One admin, one phone. Building a notification preferences UI with multiple channels is over-engineering. GHL SMS is already integrated. If the admin wants Slack, that's v2. | Hardcode GHL SMS to admin's phone number (stored in env var or Supabase Vault). |
| **Alert severity levels** | "Critical vs warning vs info" seems like proper alerting. | One event triggers alerts: `failed_permanent`. There's no gradient. It either permanently failed or it didn't. Severity tiers add complexity for one signal. | Single alert type: permanent failure. Everything else shows on the dashboard. |
| **Alert acknowledgement / snooze** | "Mark alert as handled" like PagerDuty. | This is a one-person operation. The admin sees the SMS, looks at the dashboard, fixes the issue. No need for an ack system. The delivery can be manually retried from the existing retry endpoint. | Manual retry endpoint (`/api/deliveries/[id]/retry`) already exists. That's the "ack." |
| **Escalation chains** | "If not acknowledged in 10 min, escalate to backup admin." | One admin. No one to escalate to. | Out of scope permanently unless the team grows. |

---

## Feature 3: Daily Digest (Morning Summary)

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Scheduled delivery at 8 AM Pacific** | The spec says 8 AM Pacific (3 PM PKT). HubSpot sends theirs at "each morning at 8 AM based on portal timezone." LeadCenter sends at 6 AM local. Consistent timing builds a habit. | MEDIUM | Use pg_cron to trigger a Supabase Edge Function at `0 15 * * *` (3 PM UTC = 8 AM Pacific). Edge Function queries stats and sends via GHL. |
| **Yesterday's lead count** | How many leads came in during the overnight period. The most basic "what happened while I was asleep" metric. | LOW | `SELECT count(*) FROM leads WHERE created_at BETWEEN yesterday_start AND today_start`. |
| **Assignment breakdown** | How many were assigned vs unassigned. If unassigned count is high, the admin needs to check order config. | LOW | Filter leads by status for yesterday's date range. |
| **Delivery results per channel** | How many webhook/email/SMS deliveries succeeded vs failed yesterday. The admin needs to know if overnight deliveries landed. | LOW | Query `deliveries` grouped by channel and status for yesterday. |
| **Failed delivery count with details** | If any deliveries permanently failed overnight, list them. This is the "don't let failures slip through" safety net. | LOW | Query `deliveries` where `status = 'failed_permanent'` and yesterday. Include lead name and broker. |
| **Unassigned lead count** | How many leads hit the unassigned queue overnight. Non-zero means the admin has work to do. | LOW | Query `unassigned_queue` where `created_at` is yesterday and `resolved = false`. |
| **Dual delivery via GHL (email + SMS)** | The spec calls for both. Email has the detailed version, SMS has the summary. HubSpot does the same: email with full details, mobile push with highlight. | MEDIUM | Use existing `sendEmail()` for HTML digest and `sendSms()` for a compact summary. Both target the admin's GHL contact ID. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Comparison to prior day/week** | "42 leads yesterday (up 15% from last week average)." Gives trend context without building a full analytics dashboard. LeadCenter and HubSpot both include comparative metrics. | LOW | Query previous 7-day average. Compare to yesterday. Include delta. Simple math. |
| **Actionable items section** | Separate section for "things that need your attention": unresolved unassigned leads, permanently failed deliveries, orders about to complete (leads_remaining < 5). Turns digest from informational to actionable. | MEDIUM | Multiple queries, but all straightforward. Adds real operational value. The admin opens the email and knows exactly what needs doing. |
| **HTML-formatted email** | Clean, styled email vs plain text. The existing `buildEmailHtml()` in the GHL client already builds styled HTML tables. Reuse the pattern for the digest. | LOW | Build an HTML template with sections. Style inline (email client compatibility). Use the same aesthetic as lead delivery emails. |
| **Active orders summary** | List active orders with fill progress (e.g., "Broker A: 45/100 leads, 55 remaining"). Gives the admin a quick pulse on order health without opening the dashboard. | LOW | Query `orders` where `status = 'active'`. Join broker name. Show `leads_delivered / total_leads`. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Configurable digest schedule** | "What if the admin wants it at 7 AM instead of 8?" | One admin, one hardcoded time. Building a schedule picker UI, storing preferences, handling timezone conversion. All for one person. | Hardcode 8 AM Pacific in the pg_cron job. Change it by updating the cron expression if needed. Takes 10 seconds. |
| **Digest opt-in/opt-out toggle** | "Let the admin disable it." | One admin. If they don't want it, remove the cron job. A UI toggle for one user is silly. | Comment out the cron schedule or set an env flag. |
| **Weekly/monthly roll-up digests** | "Also send a weekly summary every Friday." | Scope creep. Weekly analytics belong in the dashboard, not in email. The daily digest handles the "what happened overnight" use case. | If weekly is needed later, it's just another cron job with a wider date range. Trivial to add, but defer. |
| **Digest preview / test send** | "Let me see what it'll look like before enabling." | Build a "send test" button, preview mode, etc. Over-engineering. | Test by triggering the edge function manually once. Verify the email looks right. Done. |

---

## Feature 4: Unassigned Lead Alerts (Real-time GHL Notification)

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Immediate notification when a lead goes unassigned** | The whole point. When `assign_lead()` returns `status: 'unassigned'`, the admin needs to know NOW. Speed-to-lead research shows response time directly impacts conversion. Every unassigned lead is revenue sitting on the table. | LOW | The `assign_lead()` function already inserts into `unassigned_queue` and `activity_log` with `event_type = 'lead_unassigned'`. Hook into this event. |
| **Alert includes lead details** | Admin needs to know WHO the lead is to decide whether to manually assign. Name, vertical, credit score are the minimum context. | LOW | The `activity_log` entry already stores `vertical` and `credit_score` in `details`. The `unassigned_queue` stores `reason` and `details`. |
| **Alert includes match failure reason** | "No active orders for vertical: MCA" or "Credit score 580 below minimum for all orders" tells the admin exactly what to fix. The existing `build_match_failure_reason()` function already generates this. | LOW | Already stored in `unassigned_queue.reason` and `unassigned_queue.details`. Include in the alert. |
| **SMS delivery to admin** | Consistent with failure alerts. SMS is the immediate channel. Admin's phone buzzes, they see the problem, they act. | LOW | Reuse the same `sendSms()` pattern from failure alerts. Same admin GHL contact ID. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Suggested action in alert** | "Lead unassigned: John Smith (MCA, 720). No active MCA orders. Create an order or manually assign." Tells the admin what to DO, not just what happened. | LOW | Based on the failure reason, append a suggestion: "no matching orders" -> "Create an order"; "all orders paused" -> "Resume an order"; "credit score too low" -> "Manually assign or adjust order criteria." |
| **Batch alert for burst arrivals** | If 5 leads go unassigned within 2 minutes (e.g., batch of MCA leads arrives and no MCA orders exist), send one SMS summarizing all 5 instead of 5 separate messages. Same pattern as failure alert throttling. | MEDIUM | Debounce: hold alerts for 30-60 seconds, then send one summary if multiple accumulated. Prevents SMS fatigue. |
| **Deep link to unassigned queue** | SMS includes URL to the unassigned queue page where the admin can take action. | LOW | Append `https://[app-url]/unassigned` to the SMS. |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Auto-assign to fallback broker** | "If no match, automatically send to a default broker." | Defeats the purpose of criteria matching. Sending an MCA lead to a broker who only handles SBA loans wastes everyone's time. The admin needs to make a human decision about mismatches. | Alert the admin. Let them manually assign from the queue with full context. |
| **Scheduled retry of matching** | "Re-run matching every 5 minutes for unassigned leads in case a new order was created." | Creates unpredictable behavior. A lead could suddenly get assigned hours later. The admin should explicitly trigger re-matching after creating a new order. | Manual "re-match" button on the unassigned queue (future feature). For now, manual assignment. |
| **Email + SMS for every unassigned lead** | "Send both channels like the daily digest." | Email is not immediate enough for this use case. The admin needs a phone buzz, not an inbox notification. Dual-channel for individual real-time alerts is noisy. | SMS only for real-time alerts. Email is for the daily digest (summary format). |

---

## Feature Dependencies

```
[Existing: deliveries table + status lifecycle]
    +---> [Delivery Stats Dashboard] (reads deliveries grouped by channel/status)
    +---> [Failure Alerts] (triggered by failed_permanent status)
              +---> [Alert Throttling] (enhancement, prevents SMS spam)

[Existing: activity_log + event types]
    +---> [Failure Alerts] (listens for delivery_failed_permanent event)
    +---> [Unassigned Alerts] (listens for lead_unassigned event)

[Existing: GHL client (sendSms, sendEmail)]
    +---> [Failure Alerts] (sends SMS via GHL)
    +---> [Unassigned Alerts] (sends SMS via GHL)
    +---> [Daily Digest] (sends email + SMS via GHL)

[Existing: pg_cron infrastructure]
    +---> [Daily Digest] (scheduled at 8 AM Pacific via cron)

[Existing: Supabase Realtime on deliveries table]
    +---> [Delivery Stats Dashboard] (auto-refreshes on delivery changes)

[Admin GHL Contact ID] --required-by--> [Failure Alerts, Unassigned Alerts, Daily Digest]

[Delivery Stats Dashboard] --independent-of--> [Failure Alerts]
[Delivery Stats Dashboard] --independent-of--> [Unassigned Alerts]
[Failure Alerts] --independent-of--> [Unassigned Alerts]
[Daily Digest] --independent-of--> [all three above]

[Alert Throttling] --shared-by--> [Failure Alerts, Unassigned Alerts]
```

### Dependency Notes

- **All four features are independent of each other.** They can be built in any order or in parallel. No feature blocks another.
- **Admin GHL Contact ID is required by all three alert/digest features.** The admin's GHL contact must exist in the GHL system to receive SMS/email. This is a config prerequisite, not a code dependency. Store in Supabase Vault or env var.
- **Alert Throttling is shared between Failure Alerts and Unassigned Alerts.** If built, the throttle/debounce logic should be a shared utility, not duplicated. However, throttling is a differentiator, not table stakes. Can be added after the base alerts work.
- **Delivery Stats Dashboard relies only on existing data.** No new tables, no new APIs. Just queries on the existing `deliveries` and `leads` tables.
- **Daily Digest requires a new Edge Function and pg_cron job.** It's the most complex feature because it introduces a new execution context (Edge Function) and a new scheduled job.

## MVP Definition

### Launch With (v1.1 MVP)

Minimum viable monitoring and alerting. Every feature ships with its table stakes only.

- [ ] **Delivery Stats Dashboard** (today's numbers) -- new KPI row on existing dashboard: leads in, assigned, delivered per channel, failed. Real-time via existing Supabase Realtime.
- [ ] **Failure Alerts** (SMS to admin) -- GHL SMS when `failed_permanent` fires. Include lead name, broker name, channel, error. Use existing `sendSms()`.
- [ ] **Unassigned Lead Alerts** (SMS to admin) -- GHL SMS when `lead_unassigned` fires. Include lead name, vertical, credit score, failure reason.
- [ ] **Daily Digest** (8 AM Pacific) -- pg_cron triggers Edge Function. Email with yesterday's stats (leads, assignments, deliveries, failures, unassigned). SMS with compact summary.
- [ ] **Admin GHL Contact ID config** -- store admin's GHL contact ID for alert/digest delivery. Env var or Supabase Vault.

### Add After Validation (v1.1.x)

Features to add once base alerts are running and patterns are observed.

- [ ] **Alert throttling/deduplication** -- add after seeing real failure patterns. If broker URL outages cause 10+ alerts in a burst, this becomes urgent.
- [ ] **Delivery success rate percentage** -- add to dashboard once raw counts are validated.
- [ ] **Failed deliveries list with error details** -- add expandable section on dashboard for quick triage.
- [ ] **Daily digest comparison to prior day** -- add "vs yesterday" deltas once the digest format is stabilized.
- [ ] **Actionable items in digest** -- add "needs attention" section (unresolved unassigned, failing orders).
- [ ] **Suggested action in unassigned alerts** -- add contextual suggestions based on failure reason.
- [ ] **Deep links in SMS alerts** -- add URL to relevant dashboard page.

### Future Consideration (v1.2+)

Features to defer until monitoring has operational history.

- [ ] **Delivery latency metrics** -- add once there's enough data to establish baselines.
- [ ] **Hourly sparkline on dashboard** -- add if the admin needs intra-day volume visibility.
- [ ] **Active orders summary in digest** -- add if the admin finds the daily digest missing order context.
- [ ] **Configurable alert channels** -- add if the team grows beyond one admin or Slack becomes preferred.
- [ ] **Historical delivery analytics** -- add date range picker and charts if the admin needs to look back.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Delivery stats KPI row (today's numbers) | HIGH | LOW | P1 |
| Real-time stats refresh | HIGH | LOW (already wired) | P1 |
| Failure alert SMS | HIGH | LOW | P1 |
| Unassigned lead alert SMS | HIGH | LOW | P1 |
| Daily digest email + SMS | HIGH | MEDIUM | P1 |
| Admin GHL contact ID config | HIGH (blocker) | LOW | P1 |
| Channel health indicators (color) | MEDIUM | LOW | P1 |
| Alert throttling/dedup | MEDIUM | MEDIUM | P2 |
| Delivery success rate % | MEDIUM | LOW | P2 |
| Failed deliveries detail list | MEDIUM | MEDIUM | P2 |
| Digest comparison deltas | LOW | LOW | P2 |
| Digest actionable items | MEDIUM | MEDIUM | P2 |
| Suggested action in alerts | LOW | LOW | P2 |
| Deep links in SMS | LOW | LOW | P2 |
| Delivery latency metrics | LOW | MEDIUM | P3 |
| Hourly sparkline chart | LOW | MEDIUM | P3 |
| Historical analytics | LOW | HIGH | P3 |
| Configurable alert channels | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 launch. The milestone isn't complete without these.
- P2: Should have, add in fast-follow. Improves usability once base features are validated.
- P3: Nice to have. Defer until operational patterns emerge.

## Implementation Complexity Summary

| Feature | New Code | New Infrastructure | Touches Existing Code | Estimated Effort |
|---------|----------|--------------------|-----------------------|-----------------|
| Delivery Stats Dashboard | Dashboard query + UI components | None | Extends `dashboard.ts` queries, adds section to dashboard page | Small (1 day) |
| Failure Alerts | Alert sender function | None (uses existing GHL client) | Hooks into delivery pipeline or listens to activity_log | Small (half day) |
| Unassigned Lead Alerts | Alert sender function | None (uses existing GHL client) | Hooks into assignment flow or listens to activity_log | Small (half day) |
| Daily Digest | Edge Function + HTML template + stats queries | New Edge Function, new pg_cron job | None (reads existing tables) | Medium (1-2 days) |
| Alert Throttling | Debounce utility, state tracking | Optional: `alert_log` table for dedup | Wraps alert sender functions | Small-Medium (half day) |

**Total estimated effort:** 3-4 days for all P1 features.

## Trigger Mechanism Analysis

For Failure Alerts and Unassigned Alerts, there are two implementation approaches:

**Option A: Database Trigger (pg trigger on activity_log INSERT)**
- Pros: Fires reliably regardless of how the event was created (SQL function, API, manual). Uses pg_net to call an edge function or the Next.js API.
- Cons: Adds another DB trigger. pg_net calls from triggers have no easy way to throttle. Harder to test.

**Option B: Application-level hook (in the incoming lead API route and retry pipeline)**
- Pros: Full control over throttling, formatting, error handling. Easy to test. Can batch alerts.
- Cons: Only fires when the specific code path runs. If `assign_lead()` is called from a different context, alert won't fire.

**Recommendation: Option B (application-level).** The assignment flow already goes through `src/app/api/leads/incoming/route.ts`, and permanent failures go through `process_webhook_retries()`. These are the only two code paths. Application-level hooks are simpler to reason about, test, and throttle. If a new code path is added later, add the alert hook there too.

For the Daily Digest, there's only one option: pg_cron triggers a Supabase Edge Function (or calls pg_net to invoke the Next.js API). Edge Function is cleaner because it has access to the GHL API token without exposing it in a public endpoint.

## Sources

- [HubSpot Daily Digest](https://yourhubspotexpert.com/boost-productivity-with-hubspots-sales-workspace-daily-digest-email/) - Morning summary format, actionable items, team performance snapshot
- [LeadCenter Daily Digest](https://help.leadcenter.ai/whats-new/daily-digest-emails-your-day-at-a-glance) - 6 AM delivery, appointments/tasks/events sections, opt-out toggle
- [Hookdeck Webhook Monitoring](https://hookdeck.com/webhooks/guides/monitoring) - Success/failure rates, response times, payload inspection, failure grouping
- [Latenode Webhook Failure Alerts](https://latenode.com/blog/integration-api-management/webhook-setup-configuration/webhook-failure-alerts-setup-guide) - Alert on 3 consecutive failures, Dead Letter Queue triggers, multi-channel notification
- [Supabase Cron Docs](https://supabase.com/docs/guides/cron) - pg_cron scheduling, Edge Function invocation via pg_net, job run history
- [Supabase Schedule Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) - pg_cron + pg_net pattern for triggering Edge Functions on schedule
- [LeadSimple Automated Lead Distribution](https://training.leadsimple.com/en/articles/2876828-automated-lead-distribution-notifications-routing) - Push notifications for unassigned leads, agent notification patterns
- [Agile CRM Real-time Alerts](https://www.agilecrm.com/realtime-alerts) - Instant alerts for lead events, contact activity triggers
- [Twilio Real-time Lead Alerts](https://www.twilio.com/en-us/use-cases/lead-alerts) - SMS alert patterns for lead events, speed-to-lead emphasis
- [monday.com Lead Analytics Dashboard](https://monday.com/blog/crm-and-sales/lead-analytics-dashboard/) - 7 essential metrics for lead dashboards, real-time refresh patterns
- [monday.com CRM Dashboards 2026](https://monday.com/blog/crm-and-sales/crm-dashboards/) - KPI cards, visual indicators, actionable dashboard design

---
*Feature research for: Monitoring, Alerting & Daily Digest (v1.1 Milestone)*
*Researched: 2026-03-13*
