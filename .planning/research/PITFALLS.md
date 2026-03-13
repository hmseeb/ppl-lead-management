# Pitfalls Research

**Domain:** Monitoring, alerting, and daily digest for existing lead distribution system (Supabase + Next.js + GHL)
**Researched:** 2026-03-13
**Milestone:** v1.1 Monitoring & Alerting
**Confidence:** HIGH (verified via Supabase official docs, GHL official API docs, existing codebase analysis)

---

## Critical Pitfalls

### Pitfall 1: pg_cron UTC-Only Scheduling Breaks Daily Digest Timing

**What goes wrong:**
You schedule the daily digest for "8 AM Pacific" using `0 8 * * *` in pg_cron. It actually fires at 8 AM UTC (which is midnight Pacific in winter, 1 AM Pacific in summer). The admin gets their "morning summary" in the middle of the night. Worse: Pacific Time observes DST, so UTC-8 becomes UTC-7 in March and reverts in November. A static UTC offset drifts by an hour twice a year.

**Why it happens:**
pg_cron on Supabase runs exclusively in UTC. The `cron.timezone` setting requires a `postmaster` context change (full Postgres restart), and Supabase does not expose this setting to users. There is no way to configure pg_cron to run in a local timezone on Supabase. This is a confirmed, unresolved limitation as of March 2026.

**Consequences:**
- Digest arrives at the wrong time (confusing at best, missed entirely at worst)
- DST transitions shift the delivery time by 1 hour silently
- Admin may stop trusting the system if timing feels random

**Prevention:**
Calculate the UTC equivalent of 8 AM Pacific and schedule accordingly:
- PST (Nov-Mar): 8 AM Pacific = 4 PM UTC = `0 16 * * *`
- PDT (Mar-Nov): 8 AM Pacific = 3 PM UTC = `0 15 * * *`

**Two approaches, pick one:**

**Option A (simple, recommended for v1.1):** Schedule at `0 16 * * *` (UTC) which is 8 AM PST. Accept that during PDT it arrives at 9 AM Pacific. Document this. The admin will barely notice a 1-hour drift for a non-urgent morning summary.

**Option B (exact, more complex):** The pg_cron job runs at both `0 15 * * *` AND `0 16 * * *`. The edge function checks `SELECT now() AT TIME ZONE 'America/Los_Angeles'` and only executes if the Pacific hour is 8. The other invocation becomes a no-op.

```sql
-- Option B implementation
CREATE OR REPLACE FUNCTION maybe_send_daily_digest()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  pacific_hour integer;
BEGIN
  pacific_hour := EXTRACT(hour FROM now() AT TIME ZONE 'America/Los_Angeles');
  IF pacific_hour != 8 THEN
    RETURN; -- Not 8 AM Pacific, skip
  END IF;
  -- Fire edge function via pg_net...
END;
$$;

-- Schedule at both possible UTC times
SELECT cron.schedule('daily-digest-pst', '0 16 * * *', 'SELECT maybe_send_daily_digest()');
SELECT cron.schedule('daily-digest-pdt', '0 15 * * *', 'SELECT maybe_send_daily_digest()');
```

**Detection:** Check `cron.job_run_details` for execution times. Compare against expected Pacific Time delivery. Alert if digest was sent outside the 7:55-8:05 AM Pacific window.

**Phase to address:** Daily Digest feature. Must be designed with timezone awareness from the first migration.

---

### Pitfall 2: Alert Storm from Batch Failures (50 Deliveries Fail at Once)

**What goes wrong:**
A broker's CRM endpoint goes down. The retry pipeline marks 50 deliveries as `failed_permanent` in a single `process_webhook_retries()` execution. Each status change to `failed_permanent` fires a trigger that sends an SMS alert via GHL. The admin receives 50 SMS messages in 10 seconds. GHL rate-limits you after the 10th request (100 req/10s burst limit shared across ALL API calls). Subsequent alerts for genuinely new problems are silently dropped.

This is not hypothetical. The existing `process_webhook_retries()` function already bulk-updates failed deliveries in a FOR loop (see migration 00011, lines 431-451), which means a batch of failures hits `failed_permanent` status within a single cron execution.

**Why it happens:**
Naive alert implementation: "when status = failed_permanent, send SMS." No deduplication, no throttling, no grouping. Combined with the fact that delivery failures are correlated (same broker endpoint down = all deliveries to that broker fail together).

**Consequences:**
- Admin ignores ALL alerts after being spammed (alert fatigue, the #1 killer of monitoring systems)
- GHL API rate limit exhausted on alert SMS, blocking actual lead delivery SMS/email
- The alert system itself becomes the problem, not the solution

**Prevention:**
Implement a three-layer defense:

**Layer 1: Debounce at the trigger level.** Do NOT trigger an alert on every individual `failed_permanent` row. Instead, the trigger should check: "has an alert been sent for this broker in the last 15 minutes?" If yes, skip. Store last-alert timestamps in a simple `alert_state` table.

```sql
-- Alert deduplication check
SELECT EXISTS (
  SELECT 1 FROM alert_state
  WHERE alert_type = 'delivery_failed'
    AND context_id = NEW.broker_id::text
    AND last_sent_at > now() - interval '15 minutes'
);
```

**Layer 2: Batch into a single alert.** Instead of "Delivery X failed," send "5 deliveries to Broker Y failed in the last 15 minutes." The edge function should aggregate before sending.

**Layer 3: Rate-limit GHL API calls.** Cap alert SMS to maximum 1 per broker per 15 minutes, and maximum 5 total alert SMS per hour. This protects both the admin's sanity and the GHL rate limit budget.

**Detection:** Monitor `alert_state` table. If `suppressed_count` is climbing, the underlying problem is growing while alerts are being throttled. Surface suppressed counts in the dashboard.

**Phase to address:** Failure Alerts feature. The deduplication mechanism must be built BEFORE the alert trigger, not added after the admin complains about spam.

---

### Pitfall 3: Trigger Cascade Creates Infinite Activity Log Loop

**What goes wrong:**
You add a trigger on `deliveries` table: when `status` changes to `failed_permanent`, call an edge function to send an SMS alert. The edge function updates the `deliveries` row (to mark "alert_sent = true"). This UPDATE fires the trigger again. The trigger checks the status and maybe skips, but the UPDATE also fires the `deliveries_updated_at` trigger, which fires the Realtime listener, which calls `router.refresh()`, which re-fetches all dashboard data.

Meanwhile, the alert edge function also writes to `activity_log` to record "alert sent." The Realtime listener is subscribed to `activity_log` INSERTs (line 27 of realtime-listener.tsx). This fires another `router.refresh()`. If multiple alerts are being processed, the browser is hammered with refresh calls.

**Why it happens:**
The existing system already has these active triggers and subscriptions:
- `trg_fire_outbound_webhook` on deliveries INSERT
- `trg_fire_ghl_delivery` on deliveries INSERT
- `deliveries_updated_at` on deliveries UPDATE
- Realtime subscription on `deliveries` table (all events)
- Realtime subscription on `activity_log` table (INSERT)

Adding a new trigger on `deliveries` UPDATE (for status changes) creates a cascade path: delivery status change -> trigger -> edge function -> delivery update -> trigger again. Even if the trigger has a guard clause (`WHEN NEW.status = 'failed_permanent' AND OLD.status != 'failed_permanent'`), every UPDATE still fires the `updated_at` trigger and emits a Realtime event.

**Consequences:**
- Browser gets flooded with `router.refresh()` calls during failure bursts
- Edge function invocations multiply (each costs compute time)
- In worst case, a trigger that UPDATEs the same row it was triggered by creates a recursion that Postgres will kill after hitting `max_stack_depth`

**Prevention:**

1. **Use `WHEN` clause on the trigger definition, not inside the function:**
```sql
CREATE TRIGGER trg_alert_on_failure
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  WHEN (NEW.status = 'failed_permanent' AND OLD.status IS DISTINCT FROM 'failed_permanent')
  EXECUTE FUNCTION notify_delivery_failure();
```
This prevents the function from even executing unless the specific transition happened.

2. **Never UPDATE the row that triggered the alert from within the alert handler.** Track alert state in a SEPARATE table (`alert_state`), not on the `deliveries` row. This breaks the cascade.

3. **Debounce `router.refresh()` in the Realtime listener.** The current implementation calls `router.refresh()` on EVERY event with no throttling. During a failure burst, this could fire 20+ refreshes per second.

```typescript
// Add debouncing to the realtime listener
const debouncedRefresh = useMemo(
  () => debounce(() => router.refresh(), 500),
  [router]
)
```

4. **Use Realtime filters** to avoid receiving events you don't need:
```typescript
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'deliveries',
  filter: 'status=eq.failed_permanent'
}, handler)
```

**Detection:** Monitor `pg_stat_user_functions` for call counts on trigger functions. If `notify_delivery_failure` is called more times than there are `failed_permanent` deliveries, you have a cascade.

**Phase to address:** Failure Alerts feature. Map all existing triggers before adding new ones. Draw the cascade graph on paper first.

---

### Pitfall 4: GHL API Rate Limit Exhaustion Blocks Lead Delivery

**What goes wrong:**
You're using a PIT (Private Integration Token) for the GHL Conversations API. GHL's rate limit is 100 requests per 10 seconds per location. Your alert SMS, daily digest messages, lead delivery emails, and lead delivery SMS all share this same budget. During a busy morning: 10 leads arrive (each with email + SMS delivery = 20 API calls), plus the daily digest fires (1-2 API calls), plus 3 failure alerts go out (3 API calls). You're at 25 requests. Fine.

But then a broker re-enables after an outage, and 30 queued retries fire simultaneously. That's 30 more API calls in a single pg_cron cycle. Total: 55 requests. Still under 100. But the existing `deliver-ghl` edge function has NO rate awareness. If retries and fresh deliveries overlap within the same 10-second window, you can hit 100.

When GHL rate-limits you (HTTP 429), the edge function marks the delivery as "failed." The retry pipeline picks it up again later. But the failure alert trigger fires for each 429 failure, sending MORE GHL API calls (SMS alerts), which further exhausts the rate limit. Death spiral.

**Why it happens:**
The system uses GHL for both operational delivery (sending leads to brokers via email/SMS) and monitoring (sending alert SMS to admin). These share one API token and one rate limit budget. No priority queue exists. Alerts compete with deliveries for the same limited resource.

**Consequences:**
- Actual lead deliveries delayed because alert SMS consumed the rate budget
- 429 errors cascade into more alerts which cause more 429 errors
- Leads sitting on thank-you pages waiting for AI calls that never come because their delivery was rate-limited

**Prevention:**

1. **Do NOT treat 429 as a permanent failure.** The existing edge function currently marks any non-2xx response as "failed." Add specific handling for 429:
```typescript
if (ghlResponse.status === 429) {
  // Rate limited - set to 'failed' but with a special error message
  // The retry pipeline will pick it up with backoff
  await supabase.from('deliveries').update({
    status: 'failed',
    error_message: 'rate_limited_429',
  }).eq('id', delivery_id)
  return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
}
```

2. **Read and respect the `X-RateLimit-Remaining` header.** Before sending, check remaining budget. If <10 remaining, delay non-critical messages (alerts, digests) and prioritize lead deliveries.

3. **Prioritize traffic classes.** Lead delivery (email/SMS to brokers) > Unassigned alerts > Failure alerts > Daily digest. If rate budget is tight, alerts should be the first to queue, not deliveries.

4. **Separate alert delivery from lead delivery.** The daily digest and alert SMS are sent to a single admin contact (`llsWInEk2r7jRoxhPl5T`). Lead deliveries go to broker contacts. If possible, the alert messages could use a different mechanism (GHL workflow trigger instead of direct API) to avoid sharing the same rate budget. However, since both use the same PIT token and location, they share the same 100/10s limit regardless of mechanism.

5. **Add a simple queue with spacing.** Instead of firing all retries at once, space them 200ms apart:
```sql
-- In process_webhook_retries, add pg_sleep between retries
PERFORM pg_sleep(0.2); -- 200ms between each retry
```

**Detection:** Log the `X-RateLimit-Remaining` value from every GHL API response. Alert (via dashboard, NOT via GHL SMS) when remaining drops below 20.

**Phase to address:** Must be considered across ALL features. The edge function needs 429-handling before any alert code is added.

---

## Moderate Pitfalls

### Pitfall 5: Edge Function Cold Start Delays Alert Delivery

**What goes wrong:**
The admin expects "instant" SMS when a delivery fails permanently. But the alert path is: `deliveries` UPDATE -> trigger -> `pg_net.http_post` -> edge function (cold start: 200-400ms) -> GHL API call (100-300ms) -> SMS delivery by GHL (variable, 1-30s). Total: 1-30 seconds from database event to SMS received. This is actually fine for alerts. But the perception problem is different.

The real issue: pg_net fires HTTP requests asynchronously. The trigger commits, pg_net enqueues the request, and the actual HTTP call happens on the next pg_net processing cycle. pg_net processes requests in batches, and there's a small delay (typically <1s, but can be 2-5s under load). Combined with edge function cold start, total latency from DB event to edge function execution is 1-5 seconds.

For alerts, this latency is acceptable. For the daily digest, irrelevant. But if you're building a "real-time delivery status" dashboard that shows alert-sent confirmation, the UI may show "alert pending" for several seconds, confusing the admin.

**Prevention:**
- Set expectations: alerts arrive "within 30 seconds," not "instantly"
- Do NOT block the UI waiting for alert confirmation
- Show delivery status and alert status independently on the dashboard
- Keep the edge function warm by having the existing `deliver-ghl` function handle alerts too (it's already being called regularly for lead deliveries, so cold starts are rare)

**Phase to address:** Failure Alerts and Unassigned Lead Alerts. Mostly a documentation/expectation issue.

---

### Pitfall 6: Daily Digest Query Scans Entire Tables Without Time Boundaries

**What goes wrong:**
The daily digest needs "overnight stats." You write: `SELECT count(*) FROM deliveries WHERE status = 'failed_permanent'`. This counts ALL failed deliveries ever, not just last 24 hours. Or you write `WHERE created_at > now() - interval '24 hours'` but the digest runs at 8 AM Pacific and you want "since yesterday's digest," not "last 24 hours." If the digest fails and runs twice, you get overlapping windows. If it skips a day, you miss a window entirely.

**Why it happens:**
The time window for "overnight" is ambiguous. Is it midnight-to-8AM? Last 24 hours? Since last digest? Each has edge cases.

**Consequences:**
- Digest shows inflated numbers (counting old failures)
- Missed or double-counted events when digest timing drifts
- Slow query if scanning the full `deliveries` table without time bounds (grows over time)

**Prevention:**
1. Use a `digest_runs` table to track the last successful digest timestamp:
```sql
CREATE TABLE digest_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  details jsonb
);
```

2. The digest query should use: `WHERE created_at > (SELECT MAX(period_end) FROM digest_runs WHERE status = 'sent') AND created_at <= now()`

3. If no previous digest exists, default to last 24 hours.

4. Always use indexed columns (`created_at`) with range queries. The existing `idx_deliveries_status` index covers `(status, retry_count)` but NOT `created_at`. Add a composite index: `CREATE INDEX idx_deliveries_created_status ON deliveries(created_at, status)`.

**Phase to address:** Daily Digest feature. Design the time-window logic before writing the query.

---

### Pitfall 7: Unassigned Lead Alert Fires from Manual Resolution Flow

**What goes wrong:**
You add a trigger on `unassigned_queue` INSERT to send an SMS alert. The admin manually assigns a lead from the unassigned queue. The `assign_lead` function doesn't re-assign leads that are already in the unassigned queue; instead, there's a separate manual assignment flow. But what if the manual assignment path accidentally re-inserts into `unassigned_queue` (e.g., the lead matches no order on reassignment attempt)? The admin gets an alert for a lead they're actively working on.

More likely scenario: the admin resolves an unassigned lead by creating a new matching order, then triggers reassignment. If the reassignment logic INSERTs into `unassigned_queue` before checking the new order, the alert fires for a lead that's about to be assigned.

**Why it happens:**
The `assign_lead` function (migration 00011, lines 88-91) always inserts into `unassigned_queue` when no matching order is found. It doesn't check if the lead is already in the queue. The UNIQUE constraint on `lead_id` would prevent a duplicate INSERT, but if the lead was previously resolved (`resolved = true`), a new row CAN be inserted.

**Prevention:**
1. The alert trigger should check `resolved = false` on the new row AND verify no other unresolved row exists for the same lead
2. Add a "suppress alerts for leads being actively worked" mechanism: if the admin viewed the unassigned queue in the last 5 minutes, suppress SMS alerts (they're already looking)
3. Consider: do you even need SMS for unassigned leads? The dashboard already shows the unassigned queue with a count badge. SMS might be overkill here. Use the Realtime listener to show a toast notification instead. Reserve SMS for `failed_permanent` only.

**Phase to address:** Unassigned Lead Alerts feature. Question whether SMS is the right channel first.

---

### Pitfall 8: Realtime Listener Refresh Storm During Dashboard Stats Update

**What goes wrong:**
The Delivery Stats Dashboard subscribes to `deliveries` table changes via Realtime (already configured in `realtime-listener.tsx`). When a batch of leads arrives and gets assigned, each lead creates 1-3 delivery rows (crm_webhook, email, sms channels). 10 leads = up to 30 INSERT events on `deliveries`. Each one fires `router.refresh()`, which re-fetches ALL server components. The browser is making 30 full-page data fetches in rapid succession, causing visible flickering and unnecessary server load.

**Why it happens:**
The current Realtime listener (line 33-36 of `realtime-listener.tsx`) subscribes to `event: '*'` on `deliveries` with no debouncing. Every INSERT, UPDATE, and DELETE triggers a full refresh. The `assign_lead` function creates multiple delivery rows in sequence within one transaction, but pg_net emits Realtime events per-row.

**Consequences:**
- Dashboard flickers during high activity
- Server-side rendering load spikes (each `router.refresh()` re-runs all RSC data fetches)
- User perception of instability
- Supabase Realtime message costs ($2.50/million on Pro plan)

**Prevention:**
1. **Debounce the refresh.** Collect all events within a 500ms window, then refresh once:
```typescript
const debouncedRefresh = useMemo(
  () => debounce(() => router.refresh(), 500, { maxWait: 2000 }),
  [router]
)
```

2. **Use Realtime payload for optimistic updates** instead of full page refresh. For the stats dashboard, increment/decrement counters locally when events arrive, only do a full refresh every 30 seconds as reconciliation.

3. **Filter Realtime subscriptions.** Instead of `event: '*'` on deliveries, subscribe to specific transitions:
```typescript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'deliveries'
}, handleNewDelivery)
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'deliveries',
  filter: 'status=in.(failed_permanent,sent)'
}, handleStatusChange)
```

**Phase to address:** Delivery Stats Dashboard. Fix the debouncing issue before adding more Realtime-dependent features.

---

## Minor Pitfalls

### Pitfall 9: Daily Digest Edge Function Timeout on Large Data Sets

**What goes wrong:**
The daily digest edge function queries multiple tables (deliveries, leads, unassigned_queue, activity_log) to build a summary, formats an HTML email, and sends it via GHL. As data grows, the queries take longer. Supabase edge functions have a 150-second idle timeout and 2-second CPU time limit. The query time counts against idle timeout (it's I/O wait, not CPU), but if the function does complex aggregation in JS, it can hit the 2-second CPU limit.

**Prevention:**
- Pre-compute the digest stats in a Postgres function. Return a single JSON object with all stats. The edge function just receives the result and formats the message.
- Keep the Postgres function efficient: use indexed queries, limit to the relevant time window, avoid full table scans.
- Test with realistic data volumes (1000+ deliveries, 100+ leads per day).

**Phase to address:** Daily Digest feature.

---

### Pitfall 10: Alert State Table Not Cleaned Up

**What goes wrong:**
The `alert_state` deduplication table grows indefinitely. Every alert event creates or updates a row. After months, the table has thousands of rows. Queries against it slow down (though it's small enough this barely matters). More importantly, stale entries might interfere with deduplication logic if the broker_id is reused or the alert_type changes.

**Prevention:**
Add a pg_cron job to clean up `alert_state` rows older than 7 days:
```sql
SELECT cron.schedule(
  'cleanup-alert-state',
  '0 0 * * 0', -- Weekly on Sunday midnight UTC
  $$DELETE FROM alert_state WHERE last_sent_at < now() - interval '7 days'$$
);
```

**Phase to address:** Failure Alerts feature. Add cleanup in the same migration that creates the table.

---

### Pitfall 11: GHL Conversations API Requires Existing Contact for SMS

**What goes wrong:**
You try to send an SMS alert to the admin using `contactId: 'llsWInEk2r7jRoxhPl5T'` via the Conversations API. This works perfectly... until the contact is deleted or merged in GHL. The API returns a 400 or 404, and all alerts silently fail. Nobody notices until they manually check the dashboard.

**Prevention:**
- Store the admin contact ID in Supabase Vault (not hardcoded in the edge function or migration)
- Add a health check that verifies the contact exists on startup or daily
- If the GHL API returns 400/404 for an alert, log it prominently and show an "alert system broken" warning on the dashboard
- Have a fallback: if SMS fails, try email. If both fail, the dashboard must scream.

**Phase to address:** All alert features. Validate the admin contact ID works before going live.

---

## Phase-Specific Warnings

| Phase/Feature | Likely Pitfall | Mitigation |
|--------------|---------------|------------|
| Delivery Stats Dashboard | Realtime refresh storm during batch lead processing | Debounce `router.refresh()` with 500ms window. Use optimistic local state for counters. |
| Delivery Stats Dashboard | Stats query slow on large tables | Pre-compute today's stats in a Postgres function with proper time bounds and indexes. |
| Failure Alerts | Alert storm from correlated failures (same broker endpoint down) | Debounce per broker per 15 minutes. Batch into single message. Cap at 5 SMS/hour. |
| Failure Alerts | Trigger cascade (alert updating delivery row fires more triggers) | Alert state in separate table. Never UPDATE the triggering row from the alert handler. |
| Failure Alerts | GHL rate limit shared with lead delivery | Handle 429 specifically. Prioritize lead delivery over alerts. |
| Daily Digest | pg_cron UTC-only breaks Pacific Time scheduling | Schedule at UTC equivalent. Use dual-schedule + guard function for DST accuracy. |
| Daily Digest | Unbounded time window in stats query | Track last digest run. Query only the gap since last successful digest. |
| Daily Digest | Edge function timeout on complex aggregation | Pre-compute stats in Postgres. Edge function only formats and sends. |
| Unassigned Lead Alerts | False alerts during manual resolution workflow | Check if admin is actively working the queue. Consider toast notification instead of SMS. |
| Unassigned Lead Alerts | Duplicate alerts if lead bounces in/out of queue | UNIQUE constraint + deduplication check in trigger. |
| ALL alert features | Admin contact ID invalid/deleted in GHL | Store in Vault. Health check on startup. Fallback to email. Dashboard warning if broken. |
| ALL alert features | Alert system consumes GHL rate limit budget needed for lead delivery | Separate priority queues. Alerts yield to deliveries. Monitor `X-RateLimit-Remaining`. |

## Integration Gotchas (Specific to Adding Monitoring to THIS Codebase)

| Existing Component | What to Watch For | Correct Approach |
|-------------------|-------------------|------------------|
| `process_webhook_retries()` (migration 00011) | Bulk-marks `failed_permanent` in a FOR loop. Each row change could fire an alert trigger. | Add alert trigger AFTER the retry function, not on individual row changes. Or: add alert logic INSIDE `process_webhook_retries()` with aggregation. |
| `fire_ghl_delivery()` trigger (migration 00011) | Fires on ALL deliveries INSERT for email/sms. Alert deliveries to admin are also email/sms. Will this trigger fire for alert messages too? | Alert messages should NOT go through the `deliveries` table. Use a separate `alert_messages` table or call the edge function directly from the alert trigger without creating a delivery row. |
| `realtime-listener.tsx` | Currently subscribes to 5 tables with `event: '*'` and calls `router.refresh()` on every event. Adding stats dashboard makes this worse. | Refactor to use debouncing BEFORE adding new features. Current pattern is already fragile. |
| `check_delivery_responses()` (30-second cron) | Marks deliveries as `failed` which then enter the retry pipeline. Status changes emit Realtime events. | Ensure the alert trigger fires only on `failed_permanent`, NOT `failed` (which is a temporary state before retry). |
| Supabase Vault secrets | `fire_ghl_delivery()` already reads `supabase_url` and `service_role_key` from vault. Alert functions need `GHL_API_TOKEN` too. | Use edge function environment variables for GHL token (already configured for `deliver-ghl`). Do NOT duplicate secrets across vault and env vars. |
| `assign_lead()` function | Inserts into `unassigned_queue` when no match found (line 89-91). This is the trigger point for unassigned alerts. | The alert trigger on `unassigned_queue` INSERT is clean here. No cascade risk because `assign_lead` doesn't touch `unassigned_queue` again after inserting. |

## "Looks Done But Isn't" Checklist (v1.1 Specific)

- [ ] **Failure alerts work** but verify: what happens when 30 deliveries fail in the same pg_cron cycle? Do you get 1 SMS or 30?
- [ ] **Daily digest sends** but verify: does it send at the right Pacific Time hour? Test across a DST boundary.
- [ ] **Dashboard stats are live** but verify: does the page stutter when 20 deliveries arrive in 5 seconds? Open DevTools Network tab and count refresh requests.
- [ ] **Unassigned alert fires** but verify: does it fire again when the admin manually resolves and re-assigns a lead that still doesn't match?
- [ ] **GHL SMS sends** but verify: what happens when the admin contact ID is wrong? Does the system report the error or swallow it?
- [ ] **Alert deduplication works** but verify: does it reset properly? After 15 minutes of quiet, does the next failure correctly trigger a new alert?
- [ ] **Stats query is fast** but verify: with 10,000 delivery rows, does the dashboard still load in <1 second? Check the query plan with `EXPLAIN ANALYZE`.
- [ ] **pg_cron jobs don't overlap** but verify: you now have `check-delivery-responses` (30s), `retry-failed-webhooks` (2min), and `daily-digest` (daily). Do any of them block each other? Check `cron.job_run_details` for overlapping execution windows.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Alert storm sent 50 SMS | LOW | Admin already received them. Add deduplication mechanism. Apologize once. |
| Daily digest at wrong time for weeks | LOW | Fix the cron schedule. No data loss, just wrong timing. |
| GHL rate limit exhausted, lead deliveries delayed | MEDIUM | Deliveries will auto-retry via existing pipeline. Check `X-RateLimit-Daily-Remaining` to confirm budget recovered. Prioritize clearing the retry queue over sending more alerts. |
| Trigger cascade caused excessive edge function invocations | MEDIUM | Check Supabase usage dashboard for compute spikes. Fix the trigger guard clause. No data loss, just wasted compute. |
| Admin contact ID invalid, all alerts failing silently | HIGH | No alerts were received. Manually review `deliveries` table for any `failed_permanent` rows since alerts broke. Update contact ID in Vault. Consider adding a fallback channel. |
| Digest query scanning full table, causing slow dashboard | LOW | Add the missing index. Run `CREATE INDEX CONCURRENTLY` to avoid locking. |

## Sources

- [GoHighLevel API Rate Limits](https://help.gohighlevel.com/support/solutions/articles/48001060529-highlevel-api) - HIGH confidence (official docs). 100 req/10s burst, 200K/day.
- [GoHighLevel Private Integrations](https://help.gohighlevel.com/support/solutions/articles/155000003054-private-integrations-everything-you-need-to-know) - MEDIUM confidence (official docs, rate limits for PIT not explicitly differentiated from marketplace apps).
- [pg_cron GitHub - Timezone Issue #16](https://github.com/citusdata/pg_cron/issues/16) - HIGH confidence (primary source, upstream maintainer).
- [Supabase Discussion #7892 - Cron Job Timezone Issue](https://github.com/orgs/supabase/discussions/7892) - HIGH confidence (confirms UTC-only on Supabase, attempted upgrade reverted).
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) - HIGH confidence (official docs). Cold start median 400ms, hot 125ms.
- [Supabase pg_net Documentation](https://supabase.com/docs/guides/database/extensions/pg_net) - HIGH confidence (official docs). Async HTTP from triggers.
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) - HIGH confidence (official docs). 2s CPU, 150s idle timeout.
- [Supabase pg_cron Documentation](https://supabase.com/docs/guides/database/extensions/pg_cron) - HIGH confidence (official docs).
- [Alert Fatigue Best Practices - OneUpTime](https://oneuptime.com/blog/post/2026-02-20-monitoring-alerting-best-practices/view) - MEDIUM confidence (industry best practice, Feb 2026).
- [Alert Deduplication - Atlassian Opsgenie](https://support.atlassian.com/opsgenie/docs/what-is-alert-de-duplication/) - MEDIUM confidence (industry standard pattern).
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) - HIGH confidence (official docs).
- Existing codebase analysis: migrations 00008, 00010, 00011; `realtime-listener.tsx`; `deliver-ghl/index.ts` - HIGH confidence (direct code review).

---
*Pitfalls research for: PPL Lead Management v1.1 - Monitoring, Alerting, and Daily Digest*
*Researched: 2026-03-13*
