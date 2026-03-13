# Technology Stack: v1.1 Monitoring & Alerting

**Project:** PPL Lead Management
**Milestone:** v1.1 Monitoring & Alerting
**Researched:** 2026-03-13
**Overall confidence:** HIGH

This document covers ONLY the new additions/changes needed for the monitoring and alerting milestone. The existing v1 stack (Next.js 16, React 19, Supabase, ShadCN, recharts, date-fns, iron-session, etc.) is validated and not revisited here.

## What Already Exists (Do NOT Change)

Before listing additions, here's what the codebase already has that directly serves v1.1:

| Existing | How It Serves v1.1 | Status |
|----------|-------------------|--------|
| `deliveries` table with status/channel columns | Query source for delivery stats | Ready |
| `activity_log` table with `delivery_failed_permanent` events | Trigger source for failure alerts | Ready |
| `unassigned_queue` table | Trigger source for unassigned alerts | Ready |
| `process_webhook_retries()` marks `failed_permanent` + logs to `activity_log` | Alert trigger point already exists | Ready |
| `src/lib/ghl/client.ts` (sendEmail, sendSms) | Reuse for admin alert delivery | Ready |
| `supabase/functions/deliver-ghl/index.ts` | Template for new edge functions | Ready |
| `src/components/realtime-listener.tsx` subscribing to deliveries/unassigned_queue | Realtime already wired | Ready |
| recharts 3.8.x | Charts for stats dashboard | Ready |
| ShadCN Card component | Stats cards | Ready |
| date-fns 4.1.x | Date calculations | Ready |
| pg_cron + pg_net already configured | Scheduling infrastructure | Ready |
| Supabase Vault configured with `supabase_url` + `service_role_key` | Edge function auth | Ready |

## New Additions Required

### 1. @date-fns/tz (timezone handling for daily digest)

| Property | Value |
|----------|-------|
| Package | `@date-fns/tz` |
| Version | ^1.4.1 |
| Purpose | Pacific Time calculations for 8 AM daily digest scheduling |
| Confidence | HIGH |

**Why needed:** The daily digest fires at 8 AM Pacific, but pg_cron runs in UTC (Supabase default, and they strongly recommend keeping it). 8 AM Pacific = 15:00 UTC (PST) or 16:00 UTC (PDT). The cron expression must account for DST shifts. `@date-fns/tz` provides the `TZDate` class and `tz()` helper that work with date-fns v4 (already installed).

**Why this and not alternatives:**
- date-fns v4 has first-class `@date-fns/tz` support (no more third-party `date-fns-tz`)
- `TZDate` performs all calculations in the specified timezone
- Tiny bundle: TZDateMini is 761 B
- The project already uses date-fns v4.1.0, so this is the official companion

**Usage pattern:**
```typescript
import { TZDate } from '@date-fns/tz'
import { startOfDay, endOfDay, format } from 'date-fns'

// Get "today" boundaries in Pacific Time for digest queries
const pacificNow = new TZDate(new Date(), 'America/Los_Angeles')
const dayStart = startOfDay(pacificNow)
const dayEnd = endOfDay(pacificNow)
```

**Installation:**
```bash
bun add @date-fns/tz
```

### 2. ShadCN Chart Component (stats dashboard)

| Property | Value |
|----------|-------|
| Component | `chart` (ShadCN) |
| Install | `bunx shadcn@latest add chart` |
| Purpose | Themed chart wrappers (ChartContainer, ChartTooltip, ChartTooltipContent) |
| Confidence | HIGH |

**Why needed:** The existing `lead-volume-chart.tsx` uses raw recharts with manual dark/light theme handling (lines 34-51 of that file). ShadCN's chart component provides `ChartContainer` that handles theme-aware styling automatically and `ChartConfig` for consistent color/label management. The new delivery stats charts should use this instead of manual theme logic.

**Why this specifically:**
- Already using ShadCN for all other UI components
- Not an abstraction over recharts. it IS recharts, just with theming
- Consistent tooltip/legend styling across all charts
- Zero additional runtime dependencies (just component files copied in)

**Note:** The existing `lead-volume-chart.tsx` can optionally be migrated later, but new stats charts should use the ShadCN chart pattern from day one.

### 3. New Supabase Edge Functions (2 new functions)

No new npm packages required. Edge functions run in Deno runtime using `esm.sh` imports (same pattern as existing `deliver-ghl/index.ts`).

#### Edge Function: `send-alert`

| Property | Value |
|----------|-------|
| Runtime | Deno (Supabase Edge Functions) |
| Trigger | pg_net HTTP POST from DB trigger or pg_cron |
| Purpose | Send admin SMS/email alerts via GHL Conversations API |
| Dependencies | `@supabase/supabase-js@2` via esm.sh (same as deliver-ghl) |
| Confidence | HIGH |

**Why a single generic alert function (not one per alert type):**
- Failure alerts, unassigned alerts, and digest all ultimately do the same thing: send a GHL message to the admin contact
- A single edge function with an `alert_type` discriminator keeps the codebase DRY
- The payload determines the message content, the function handles delivery

**Payload contract:**
```typescript
interface AlertPayload {
  alert_type: 'failure' | 'unassigned' | 'daily_digest'
  admin_contact_id: string   // GHL contact ID for the admin
  channels: ('sms' | 'email')[]
  data: Record<string, unknown>  // alert-specific data
}
```

#### Edge Function: `daily-digest`

| Property | Value |
|----------|-------|
| Runtime | Deno (Supabase Edge Functions) |
| Trigger | pg_cron (daily at 15:00 UTC / 16:00 UTC depending on DST) |
| Purpose | Aggregate overnight stats and send digest via `send-alert` |
| Dependencies | `@supabase/supabase-js@2` via esm.sh |
| Confidence | HIGH |

**Why a separate function from send-alert:** The digest needs to query the database for aggregated stats before composing the message. It's an orchestrator that queries, formats, then calls `send-alert` (or sends directly via GHL). Keeping query logic separate from delivery logic follows single responsibility.

**Alternative considered:** Having pg_cron call a SQL function that aggregates stats and calls send-alert via pg_net. This works but SQL is a poor fit for composing rich HTML email templates. Edge function (TypeScript) is better for string templating.

### 4. New Database Constructs

#### 4a. `admin_settings` Table (or use Vault)

| Property | Value |
|----------|-------|
| Purpose | Store admin alert preferences (GHL contact ID, enabled channels, digest preferences) |
| Confidence | HIGH |

**Recommendation: Use a simple `admin_settings` table, NOT Vault.**

Vault is for secrets (API keys, tokens). Alert preferences (which contact to notify, which channels are enabled) are configuration, not secrets. A single-row `admin_settings` table is simpler to query from both SQL functions and edge functions.

```sql
CREATE TABLE admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_ghl_contact_id text NOT NULL,
  alert_email_enabled boolean DEFAULT true,
  alert_sms_enabled boolean DEFAULT true,
  digest_enabled boolean DEFAULT true,
  digest_time text DEFAULT '08:00',  -- display only, actual cron is fixed
  digest_timezone text DEFAULT 'America/Los_Angeles',
  failure_alert_enabled boolean DEFAULT true,
  unassigned_alert_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Single row constraint
CREATE UNIQUE INDEX admin_settings_singleton ON admin_settings ((true));
```

**Why single-row with singleton constraint:** The app has single-admin auth. No need for a multi-row settings table. The unique index on `((true))` enforces exactly one row.

#### 4b. DB Trigger: `notify_on_failure`

| Property | Value |
|----------|-------|
| Purpose | Fire alert edge function when `activity_log` gets a `delivery_failed_permanent` event |
| Mechanism | AFTER INSERT trigger on `activity_log` + pg_net HTTP POST to `send-alert` |
| Confidence | HIGH |

**Why trigger on activity_log, not on deliveries table:**
- `process_webhook_retries()` already inserts into `activity_log` when marking `failed_permanent`
- Triggering on activity_log avoids double-triggering if the deliveries update and log insert happen in the same transaction
- The activity_log row already has the delivery context (lead_id, broker_id, channel, error)

```sql
CREATE OR REPLACE FUNCTION notify_admin_on_failure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin record;
  v_supabase_url text;
  v_service_key text;
BEGIN
  IF NEW.event_type != 'delivery_failed_permanent' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_admin FROM admin_settings LIMIT 1;
  IF NOT FOUND OR v_admin.failure_alert_enabled = false THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-alert',
    body := jsonb_build_object(
      'alert_type', 'failure',
      'admin_contact_id', v_admin.alert_ghl_contact_id,
      'channels', CASE
        WHEN v_admin.alert_sms_enabled THEN '["sms"]'::jsonb
        ELSE '[]'::jsonb
      END,
      'data', NEW.details
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_on_failure
  AFTER INSERT ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_failure();
```

#### 4c. DB Trigger: `notify_on_unassigned`

| Property | Value |
|----------|-------|
| Purpose | Fire alert edge function when a lead lands in `unassigned_queue` |
| Mechanism | AFTER INSERT trigger on `unassigned_queue` + pg_net HTTP POST to `send-alert` |
| Confidence | HIGH |

**Same pattern as failure alert.** Triggers on `unassigned_queue` INSERT, which already happens inside `assign_lead()`.

#### 4d. pg_cron Job: `daily-digest`

| Property | Value |
|----------|-------|
| Schedule | `0 15 * * *` (15:00 UTC = 8:00 AM Pacific Standard Time) |
| Target | Edge function `daily-digest` via pg_net |
| Confidence | HIGH |

**Critical: DST handling for Pacific Time.**

pg_cron on Supabase runs in UTC. There is no per-job timezone support in pg_cron. The `cron.timezone` config requires a Postgres restart and is global (not per-job). On hosted Supabase, you cannot change `cron.timezone`.

**Two options for handling DST:**

| Option | Approach | Tradeoff |
|--------|----------|----------|
| A. Fixed UTC, accept 1hr drift | `0 15 * * *` (always 15:00 UTC) | 8 AM PST / 8 AM PDT is really 15:00 / 16:00 UTC. During PDT (March-November), the digest arrives at 8 AM. During PST (November-March), it arrives at 7 AM. |
| B. Two cron jobs, toggle seasonally | One at `0 15 * * *`, one at `0 16 * * *`. Disable one. | Correct time year-round but requires manual toggle twice a year (or an edge function that checks DST). |
| **C. Use 16:00 UTC (recommended)** | `0 16 * * *` | **8 AM PDT / 9 AM PST.** During most of the year (PDT, March-November) it's exactly 8 AM. During winter (PST, November-March) it arrives at 9 AM. Acceptable for a morning digest. |

**Recommendation: Option C.** A morning digest at 8 AM or 9 AM is fine. No complexity, no manual toggles. If the admin wants it exact, Option B with an edge function that checks DST is the upgrade path.

```sql
SELECT cron.schedule(
  'daily-digest',
  '0 16 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
             || '/functions/v1/daily-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{"trigger": "cron"}'::jsonb
    ) AS request_id;
  $$
);
```

#### 4e. Postgres View: `delivery_stats_today`

| Property | Value |
|----------|-------|
| Purpose | Materialized query for real-time stats dashboard |
| Confidence | HIGH |

**Why a view and not an RPC function:** Views compose better with Supabase's client SDK (`.from('delivery_stats_today').select('*')`). They can also be subscribed to for realtime updates via postgres_changes on the underlying table.

**However:** Supabase Realtime cannot subscribe to views directly. The realtime listener already subscribes to the `deliveries` table. On each change, the dashboard page refreshes (via `router.refresh()`), which re-fetches server components including the stats query. So the view is just for query cleanliness on the server side.

```sql
CREATE OR REPLACE VIEW delivery_stats_today AS
SELECT
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS total_today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND status = 'sent') AS sent_today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND status IN ('failed', 'failed_permanent')) AS failed_today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND channel = 'crm_webhook') AS webhook_today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND channel = 'email') AS email_today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND channel = 'sms') AS sms_today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND status = 'failed_permanent') AS perm_failed_today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND status = 'pending') AS pending_today
FROM deliveries;
```

**Alternative considered:** A Postgres function with time range parameters. Better for flexible querying but the dashboard always shows "today", so a simple view suffices. The edge function for daily digest will use its own query with explicit date range.

## What NOT to Add

| Technology | Why Not |
|-----------|---------|
| Resend / SendGrid / Twilio | Already using GHL Conversations API for all messaging. Adding another provider creates two delivery paths to maintain. |
| Supabase Queues (pgmq) for alerts | Overkill. Alert volume is low (handful per day at most). Direct pg_net to edge function is simpler. pgmq would make sense if alerts needed guaranteed delivery with dead-letter queues, but a missed alert can be caught by the daily digest. |
| Supabase Database Webhooks (dashboard UI) | The existing pattern of pg_net from SQL triggers is equivalent and already in use. Database Webhooks are just a convenience wrapper around the same pg_net triggers. Switching to the dashboard UI for some triggers and SQL for others creates inconsistency. |
| cron job library (node-cron, etc.) | pg_cron handles all scheduling at the database level. No need for an application-level scheduler. |
| Notification toast library beyond Sonner | Sonner (already installed) handles all client-side notifications. No need for react-toastify or similar. |
| ShadCN Alert component | The existing Card component + Badge + lucide icons are sufficient for stats display. Alert component is for inline page warnings, not dashboard stats cards. |
| @date-fns/utc | Not needed. The edge function operates in UTC naturally (Deno runtime). @date-fns/tz is needed for Pacific Time conversion, but UTC operations work with plain Date. |

## GHL API Rate Limits (Critical Constraint)

| Limit | Value | Impact |
|-------|-------|--------|
| Burst | 100 requests / 10 seconds per location | NOT a concern for alerts. Even in worst case: 1 failure alert + 1 unassigned alert = 2 requests. |
| Daily | 200,000 requests / day per location | NOT a concern. At most: ~100 failure alerts + ~50 unassigned alerts + 1 digest = ~151/day. |
| Response headers | `X-RateLimit-Remaining`, `X-RateLimit-Interval-Milliseconds` | The `send-alert` edge function should check these headers and log warnings if approaching limits. |

**Batching concern:** If multiple deliveries fail permanently in the same `process_webhook_retries()` cycle (batch size 10), each one inserts into `activity_log`, each insert fires the trigger, each trigger calls the edge function. Worst case: 10 near-simultaneous SMS alerts.

**Mitigation:** Add a debounce/dedup check in the trigger. If an alert was sent in the last 5 minutes for the same type, skip and let the admin check the dashboard.

```sql
-- In notify_admin_on_failure(), add before the pg_net call:
IF EXISTS (
  SELECT 1 FROM activity_log
  WHERE event_type = 'admin_alert_sent'
    AND (details->>'alert_type')::text = 'failure'
    AND created_at > now() - interval '5 minutes'
) THEN
  RETURN NEW;  -- skip, recent alert already sent
END IF;

-- After sending, log the alert:
INSERT INTO activity_log (event_type, details)
VALUES ('admin_alert_sent', jsonb_build_object('alert_type', 'failure'));
```

## Integration Points Summary

```
Delivery fails permanently
  -> process_webhook_retries() marks failed_permanent
  -> INSERT into activity_log (event_type = 'delivery_failed_permanent')
  -> trg_notify_admin_on_failure fires
  -> pg_net POST to send-alert edge function
  -> Edge function sends GHL SMS to admin

Lead goes unassigned
  -> assign_lead() inserts into unassigned_queue
  -> trg_notify_admin_on_unassigned fires
  -> pg_net POST to send-alert edge function
  -> Edge function sends GHL SMS to admin

Daily digest (8 AM Pacific)
  -> pg_cron fires at 16:00 UTC
  -> pg_net POST to daily-digest edge function
  -> Edge function queries delivery_stats + unassigned count
  -> Edge function calls GHL Conversations API (email + SMS)

Dashboard stats
  -> Server component queries delivery_stats_today view
  -> Renders KPI cards with delivery breakdown
  -> Realtime listener on deliveries table triggers router.refresh()
  -> Stats update within seconds
```

## Installation Summary

```bash
# Only new dependency
bun add @date-fns/tz

# New ShadCN component (copies files, no runtime dep)
bunx shadcn@latest add chart
```

**That's it.** One npm package and one ShadCN component. Everything else is Supabase-side (SQL migrations, edge functions, pg_cron jobs).

## New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `supabase/functions/send-alert/index.ts` | Edge Function | Generic admin alert sender via GHL |
| `supabase/functions/daily-digest/index.ts` | Edge Function | Morning digest aggregator + sender |
| `supabase/migrations/00012_admin_settings.sql` | Migration | admin_settings table |
| `supabase/migrations/00013_alert_triggers.sql` | Migration | Failure + unassigned alert triggers |
| `supabase/migrations/00014_daily_digest_cron.sql` | Migration | pg_cron job for daily digest |
| `supabase/migrations/00015_delivery_stats_view.sql` | Migration | delivery_stats_today view |
| `src/lib/queries/delivery-stats.ts` | Query | Fetch delivery stats for dashboard |
| `src/components/dashboard/delivery-stats.tsx` | Component | Stats cards for delivery metrics |

## Sources

- Supabase Scheduling Edge Functions: https://supabase.com/docs/guides/functions/schedule-functions (HIGH confidence)
- Supabase Cron docs: https://supabase.com/docs/guides/cron (HIGH confidence)
- Supabase Database Webhooks: https://supabase.com/docs/guides/database/webhooks (HIGH confidence)
- pg_cron GitHub (timezone behavior): https://github.com/citusdata/pg_cron (HIGH confidence)
- pg_cron timezone issue: https://github.com/citusdata/pg_cron/issues/16 (HIGH confidence)
- Supabase DB config (UTC default): https://supabase.com/docs/guides/database/postgres/configuration (HIGH confidence)
- date-fns v4 timezone blog: https://blog.date-fns.org/v40-with-time-zone-support/ (HIGH confidence)
- @date-fns/tz npm: https://www.npmjs.com/package/@date-fns/tz (HIGH confidence)
- date-fns timezone docs: https://date-fns.org/v4.0.0/docs/Time-Zones (HIGH confidence)
- GHL API rate limits: https://help.gohighlevel.com/support/solutions/articles/48001060529-highlevel-api-documentation (MEDIUM confidence)
- GHL Conversations API: https://marketplace.gohighlevel.com/docs/ghl/conversations/conversations/index.html (MEDIUM confidence)
- ShadCN Chart component: https://ui.shadcn.com/docs/components/radix/chart (HIGH confidence)
- Supabase Realtime postgres_changes: https://supabase.com/docs/guides/realtime/postgres-changes (HIGH confidence)
