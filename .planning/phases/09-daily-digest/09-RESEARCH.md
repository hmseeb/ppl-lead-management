# Phase 9: Daily Digest - Research

**Researched:** 2026-03-13
**Domain:** Scheduled edge function, pg_cron/pg_net, GHL Conversations API (email + SMS), HTML email templating
**Confidence:** HIGH

## Summary

Phase 9 adds a daily morning digest that sends overnight stats to the admin at 8 AM Pacific via email (detailed HTML) and SMS (compact summary) through the GHL Conversations API. The architecture is straightforward: a pg_cron job fires at `0 16 * * *` UTC (= 8 AM PST, accept 9 AM during PDT), calls a new `send-digest` edge function via pg_net, which queries Supabase for stats since the last digest, builds both an HTML email and a compact SMS body, then sends both to the admin's GHL contact ID.

All building blocks already exist in the codebase. The `deliver-ghl` edge function (Phase 3) proves the GHL email pattern: `type: 'Email'` uses the `html` field for body, `type: 'SMS'` uses the `message` field. The `send-alert` edge function (Phase 6) proves the pg_net-to-edge-function-to-GHL pipeline. The `admin_settings` table (migration 00012) stores the admin's GHL contact ID. Vault secrets for `supabase_url` and `service_role_key` are already configured. The `fetchDeliveryStats()` query in `src/lib/queries/dashboard.ts` shows exactly which stats to pull (leads received/assigned/unassigned, deliveries by channel/status, failures). The only new pieces are: a `digest_runs` tracking table, a Postgres function to compute digest stats, the `send-digest` edge function, and a pg_cron schedule.

The primary risk is the pg_cron UTC-only scheduling (Pitfall 1 in PITFALLS.md). The recommended approach is Option A: schedule at `0 16 * * *` UTC which is exactly 8 AM PST. During PDT (Mar-Nov), the digest arrives at 9 AM Pacific. This 1-hour drift is acceptable for a non-urgent morning summary. Option B (dual schedule with guard function) exists as an upgrade path if the admin cares.

**Primary recommendation:** Create a new `send-digest` edge function that receives no payload (it queries stats itself), a `digest_runs` table to track last-run timestamps, a Postgres function to compute stats and call the edge function, and a pg_cron job at `0 16 * * *` UTC.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DGST-01 | Daily digest runs at 8 AM Pacific via pg_cron -> edge function | pg_cron at `0 16 * * *` UTC = 8 AM PST. Exact pg_net-to-edge-function SQL pattern verified from Supabase official docs and existing codebase (migration 00014 `notify_delivery_failed` shows the pattern). Vault secret reading for auth token proven. |
| DGST-02 | Email digest includes overnight stats (leads received, assigned, unassigned, deliveries by channel, failures) | Stats queries mirror `fetchDeliveryStats()` in dashboard.ts. Use time-bounded queries against `leads`, `deliveries`, `unassigned_queue` tables. `digest_runs` table tracks period boundaries. HTML email uses `html` field in GHL API (proven in `deliver-ghl/index.ts` line 105). |
| DGST-03 | SMS digest includes compact summary of overnight numbers | SMS uses `message` field in GHL API (proven in `deliver-ghl/index.ts` line 119 and `send-alert/index.ts` line 98). Compact multi-line format matching existing alert SMS style. |
| DGST-04 | Digest delivered to admin via GHL Conversations API (email + SMS) | GHL Conversations API at `https://services.leadconnectorhq.com/conversations/messages` with PIT token auth. Admin contact ID from `admin_settings` table or Vault (`admin_ghl_contact_id`). Two sequential API calls: one email, one SMS. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions (Deno) | Latest | `send-digest` function to query stats, format messages, send via GHL | Already used for `deliver-ghl` and `send-alert`. Proven pattern. |
| pg_cron | Supabase-managed | Schedule daily digest at `0 16 * * *` UTC | Already used for `check-delivery-responses` (30s), `retry-failed-webhooks` (2min), `cleanup-alert-state` (weekly). |
| pg_net | Supabase-managed | HTTP POST from pg_cron to edge function | Already used by `fire_ghl_delivery()` and `notify_delivery_failed()` triggers. |
| `@supabase/supabase-js@2` | via esm.sh | Query Supabase from within edge function | Same import pattern as `deliver-ghl/index.ts` line 1. |
| GHL Conversations API | v2021-07-28 | Send email + SMS to admin contact | Same API version used across all existing GHL integrations. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Vault | Supabase-managed | Read `supabase_url`, `service_role_key`, `admin_ghl_contact_id` at runtime | Secrets needed by pg_cron SQL and edge function. Already configured in Vault from Phase 6. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge function queries stats | Postgres function pre-computes stats, passes as JSON body to edge function | Pre-compute is faster but adds complexity. Edge function querying is simpler, and the stats query runs in <100ms on current data volumes. Use edge function querying for v1.1, optimize later if needed. |
| Single pg_cron schedule (Option A) | Dual schedule with DST guard (Option B) | Option B gives exact 8 AM Pacific year-round but doubles cron jobs and adds a guard function. Option A is simpler. Accept 1hr DST drift. |

**Installation:**
No new npm packages needed. All dependencies are Supabase-managed extensions and Deno imports.

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  functions/
    send-digest/
      index.ts          # New edge function
  migrations/
    00015_daily_digest.sql  # digest_runs table + pg_cron schedule
```

### Pattern 1: pg_cron -> pg_net -> Edge Function (Proven Pattern)
**What:** pg_cron fires a SQL statement that uses `net.http_post()` to call a Supabase Edge Function with auth headers from Vault.
**When to use:** Any scheduled task that needs to make external API calls (GHL, Slack, etc.) that Postgres can't do natively.
**Example:**
```sql
-- Source: Supabase official docs + existing pattern in migration 00014
SELECT cron.schedule(
  'daily-digest',
  '0 16 * * *',  -- 8 AM PST / 9 AM PDT
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/send-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Pattern 2: Edge Function Self-Queries Supabase for Stats
**What:** The edge function creates a Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars, then runs the same count queries the dashboard uses.
**When to use:** When the edge function needs aggregated data from multiple tables to compose a message.
**Example:**
```typescript
// Source: deliver-ghl/index.ts pattern (line 82-84)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Query stats since last digest
const { data: lastRun } = await supabase
  .from('digest_runs')
  .select('period_end')
  .eq('status', 'sent')
  .order('period_end', { ascending: false })
  .limit(1)
  .single()

const periodStart = lastRun?.period_end ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const periodEnd = new Date().toISOString()
```

### Pattern 3: GHL Email with HTML Body (Proven Pattern)
**What:** GHL Conversations API uses `html` field for email body content, NOT `message`. The `message` field is for SMS only. Using `message` for email will send a blank email.
**When to use:** Any email sent via GHL Conversations API.
**Example:**
```typescript
// Source: deliver-ghl/index.ts lines 94-108 (PROVEN, working in production)
// EMAIL: uses type 'Email', html field, subject, emailFrom
await fetch(`${GHL_BASE_URL}/conversations/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ghlToken}`,
    'Version': '2021-07-28',
  },
  body: JSON.stringify({
    type: 'Email',
    contactId: adminContactId,
    subject: 'Daily Digest - PPL Lead Management',
    html: buildDigestEmailHtml(stats),  // <-- HTML body goes here, NOT 'message'
    emailFrom: fromEmail,
  }),
})

// SMS: uses type 'SMS', message field
await fetch(`${GHL_BASE_URL}/conversations/messages`, {
  method: 'POST',
  headers: { /* same headers */ },
  body: JSON.stringify({
    type: 'SMS',
    contactId: adminContactId,
    message: buildDigestSmsBody(stats),  // <-- Plain text goes here
  }),
})
```

### Pattern 4: digest_runs Tracking Table
**What:** A table that records each digest execution with period boundaries, preventing double-counting and enabling gap detection.
**When to use:** Any scheduled report that needs to know "what happened since last time."
**Example:**
```sql
CREATE TABLE digest_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  stats jsonb,  -- Store the stats snapshot for debugging/auditing
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: anon read-only (matches pattern from admin_settings)
ALTER TABLE digest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read access to digest_runs" ON digest_runs
  FOR SELECT TO anon USING (true);
```

### Anti-Patterns to Avoid
- **Using `message` field for GHL email:** This was a real bug fixed in the codebase. Email MUST use `html` field. The `message` field is SMS-only. Using it for email produces a blank email body.
- **Querying without time boundaries:** `SELECT count(*) FROM deliveries WHERE status = 'failed_permanent'` counts ALL failures ever, not just since last digest. Always use `period_start` and `period_end` from `digest_runs`.
- **Hardcoding admin contact ID in edge function:** Use `admin_settings` table or Vault secret. The contact ID may change if the GHL contact is merged/deleted.
- **Computing stats in JavaScript:** Let Postgres do the counting with `count(*)` queries. The edge function's 2-second CPU limit is tight for heavy JS aggregation. SQL COUNT is free (I/O wait, not CPU).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone-aware scheduling | Custom DST logic in the cron job | Fixed UTC offset `0 16 * * *` (Option A) | DST-aware scheduling is a rabbit hole. The 1-hour drift is acceptable for a morning summary. Upgrade to Option B later if needed. |
| HTML email rendering | Custom HTML builder from scratch | Inline-styled table-based HTML template | Email HTML is a known minefield. Use proven table-based layout with inline styles. No framework needed for a single template. |
| Digest time window tracking | Manual timestamp math | `digest_runs` table with period_start/period_end | Prevents double-counting, handles skipped digests, provides audit trail. |
| GHL API integration | New HTTP client code | Copy `deliver-ghl/index.ts` patterns exactly | The GHL API quirks (html vs message, version header, rate limits) are already solved. |

**Key insight:** This phase is 90% assembly of existing patterns and 10% new HTML template. The only genuinely new code is the email template HTML and the stats aggregation queries. Everything else is wiring proven patterns together.

## Common Pitfalls

### Pitfall 1: pg_cron UTC-Only Scheduling (Confirmed)
**What goes wrong:** Scheduling `0 8 * * *` fires at 8 AM UTC, which is midnight Pacific. The admin gets their morning digest at midnight.
**Why it happens:** pg_cron on Supabase runs exclusively in UTC. The `cron.timezone` setting requires a postmaster restart that Supabase doesn't expose.
**How to avoid:** Use `0 16 * * *` UTC = 8 AM PST. During PDT (Mar-Nov) it arrives at 9 AM Pacific. Accept the drift.
**Warning signs:** Check `cron.job_run_details` for the execution timestamp. If it doesn't match expected UTC time, the schedule is wrong.

### Pitfall 2: Using `message` Instead of `html` for GHL Email
**What goes wrong:** The email arrives with a blank body. The GHL Conversations API silently ignores the `message` field for email type messages.
**Why it happens:** The API uses different fields for different message types. `html` for email, `message` for SMS. This was a real bug fixed earlier in this project.
**How to avoid:** For `type: 'Email'`, always use `html` field. For `type: 'SMS'`, always use `message` field. Never mix them.
**Warning signs:** Email sends successfully (200 response) but the admin sees an empty email.

### Pitfall 3: Unbounded Time Window in Stats Query
**What goes wrong:** The digest counts ALL failures ever, or counts the last 24 hours even when the previous digest ran 2 hours ago (after a retry), leading to double-counted events.
**Why it happens:** No tracking of when the last digest ran. Using `now() - interval '24 hours'` is approximate and doesn't handle skipped or retried digests.
**How to avoid:** Use `digest_runs` table. Query: `WHERE created_at > (last digest period_end) AND created_at <= now()`. Default to last 24 hours if no previous digest exists.
**Warning signs:** Digest numbers don't match what the dashboard shows for the same period.

### Pitfall 4: Edge Function Timeout on Stats Aggregation
**What goes wrong:** The edge function queries 6+ tables, builds HTML, and makes 2 GHL API calls. On a slow day this takes 500ms. On a bad day with 10,000+ rows it takes 5+ seconds, hitting the Supabase edge function CPU limit (2 seconds) or idle timeout (150 seconds).
**Why it happens:** Count queries on large tables without proper indexes or time bounds. HTML string building in JS consumes CPU time.
**How to avoid:** Use time-bounded queries (always `WHERE created_at > $period_start AND created_at <= $period_end`). Run all count queries in parallel with `Promise.all()`. Keep HTML template simple (no complex loops or conditionals).
**Warning signs:** Edge function returns 504 or the digest intermittently fails to send.

### Pitfall 5: Missing Index on deliveries.created_at
**What goes wrong:** The digest queries `WHERE created_at > $start AND created_at <= $end` on the `deliveries` table. The existing index `idx_deliveries_status` covers `(status, retry_count)` but NOT `created_at`. This forces a sequential scan on the `deliveries` table.
**Why it happens:** The dashboard's `fetchDeliveryStats()` uses `gte('created_at', todayStart)` which may already be slow but isn't noticed because it runs per-request with small result sets. The digest is the first batch query with tight time bounds.
**How to avoid:** Add `CREATE INDEX idx_deliveries_created_at ON deliveries(created_at)` in the migration. Also benefits the dashboard queries.
**Warning signs:** `EXPLAIN ANALYZE` shows Seq Scan on deliveries for time-bounded queries.

## Code Examples

### Complete pg_cron + pg_net Schedule (Verified Pattern)
```sql
-- Source: Supabase docs (https://supabase.com/docs/guides/functions/schedule-functions)
-- + existing codebase pattern (migration 00014 notify_delivery_failed)

-- Schedule daily digest at 8 AM PST (16:00 UTC)
SELECT cron.schedule(
  'daily-digest',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/send-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### GHL Email Send with HTML (Verified from deliver-ghl/index.ts)
```typescript
// Source: deliver-ghl/index.ts lines 94-108 (production code)
// CRITICAL: Use 'html' field for email, NOT 'message'
const emailResponse = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ghlToken}`,
    'Version': '2021-07-28',
  },
  body: JSON.stringify({
    type: 'Email',
    contactId: adminContactId,
    subject: `Daily Digest - ${formattedDate}`,
    html: emailHtml,
    emailFrom: fromEmail,
  }),
})
```

### GHL SMS Send (Verified from send-alert/index.ts)
```typescript
// Source: send-alert/index.ts lines 88-99 (production code)
const smsResponse = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ghlToken}`,
    'Version': '2021-07-28',
  },
  body: JSON.stringify({
    type: 'SMS',
    contactId: adminContactId,
    message: smsBody,
  }),
})
```

### HTML Email Template Pattern (Inline Styles, Table-Based)
```html
<!-- Source: deliver-ghl/index.ts buildEmailHtml pattern + email best practices -->
<!-- Rules: inline styles only, table layout, web-safe fonts, no CSS classes -->
<html>
<body style="font-family:Arial,Helvetica,sans-serif;color:#333;margin:0;padding:0;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding:24px;background-color:#1a73e8;color:#ffffff;">
        <h1 style="margin:0;font-size:20px;">PPL Lead Management - Daily Digest</h1>
        <p style="margin:4px 0 0;font-size:14px;opacity:0.9;">March 13, 2026 - Morning Summary</p>
      </td>
    </tr>
    <!-- Lead Stats Section -->
    <tr>
      <td style="padding:20px 24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1a73e8;">Lead Activity</h2>
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background-color:#f8f9fa;">
            <td style="padding:8px 12px;font-weight:bold;">Received</td>
            <td style="padding:8px 12px;text-align:right;">42</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;">Assigned</td>
            <td style="padding:8px 12px;text-align:right;">38</td>
          </tr>
          <tr style="background-color:#f8f9fa;">
            <td style="padding:8px 12px;font-weight:bold;color:#d32f2f;">Unassigned</td>
            <td style="padding:8px 12px;text-align:right;color:#d32f2f;">4</td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Delivery Stats Section -->
    <tr>
      <td style="padding:0 24px 20px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1a73e8;">Deliveries</h2>
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background-color:#f8f9fa;">
            <td style="padding:8px 12px;font-weight:bold;">Total</td>
            <td style="padding:8px 12px;text-align:right;">56</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;">Sent</td>
            <td style="padding:8px 12px;text-align:right;">52</td>
          </tr>
          <tr style="background-color:#f8f9fa;">
            <td style="padding:8px 12px;font-weight:bold;color:#d32f2f;">Failed</td>
            <td style="padding:8px 12px;text-align:right;color:#d32f2f;">4</td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Channel Breakdown -->
    <tr>
      <td style="padding:0 24px 20px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1a73e8;">By Channel</h2>
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background-color:#e8f5e9;">
            <td style="padding:8px 12px;">Webhook</td>
            <td style="padding:8px 12px;text-align:right;">20 sent / 1 failed</td>
          </tr>
          <tr style="background-color:#e3f2fd;">
            <td style="padding:8px 12px;">Email</td>
            <td style="padding:8px 12px;text-align:right;">18 sent / 2 failed</td>
          </tr>
          <tr style="background-color:#fff3e0;">
            <td style="padding:8px 12px;">SMS</td>
            <td style="padding:8px 12px;text-align:right;">14 sent / 1 failed</td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:16px 24px;border-top:1px solid #e0e0e0;color:#666;font-size:12px;">
        Delivered by PPL Lead Management
      </td>
    </tr>
  </table>
</body>
</html>
```

### SMS Digest Body (Compact Format)
```
Daily Digest - Mar 13
Leads: 42 received, 38 assigned, 4 unassigned
Deliveries: 52 sent, 4 failed
Webhook: 20/1 | Email: 18/2 | SMS: 14/1
```

### Stats Query Pattern for Edge Function
```typescript
// Source: Based on fetchDeliveryStats() in src/lib/queries/dashboard.ts
// Modified to use period_start/period_end instead of todayStart
async function queryDigestStats(supabase, periodStart: string, periodEnd: string) {
  const [
    leadsReceived,
    leadsAssigned,
    leadsUnassigned,
    totalDeliveries,
    sentDeliveries,
    failedDeliveries,
    webhookTotal, webhookFailed,
    emailTotal, emailFailed,
    smsTotal, smsFailed,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd),
    supabase.from('leads').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('status', 'assigned'),
    supabase.from('leads').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('status', 'unassigned'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('status', 'sent'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'crm_webhook'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'crm_webhook').in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'email'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'email').in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'sms'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'sms').in('status', ['failed', 'failed_permanent']),
  ])

  return {
    leads: {
      received: leadsReceived.count ?? 0,
      assigned: leadsAssigned.count ?? 0,
      unassigned: leadsUnassigned.count ?? 0,
    },
    total: totalDeliveries.count ?? 0,
    sent: sentDeliveries.count ?? 0,
    failed: failedDeliveries.count ?? 0,
    channels: {
      crm_webhook: { total: webhookTotal.count ?? 0, failed: webhookFailed.count ?? 0 },
      email: { total: emailTotal.count ?? 0, failed: emailFailed.count ?? 0 },
      sms: { total: smsTotal.count ?? 0, failed: smsFailed.count ?? 0 },
    },
  }
}
```

### Admin Contact ID Retrieval
```typescript
// Option 1: From admin_settings table (preferred, matches Phase 7 trigger pattern)
const { data: settings } = await supabase
  .from('admin_settings')
  .select('alert_ghl_contact_id')
  .limit(1)
  .single()
const adminContactId = settings?.alert_ghl_contact_id

// Option 2: From Vault (used by trigger functions in SQL, less convenient in edge function)
// In SQL: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'admin_ghl_contact_id'
// In edge function: prefer admin_settings table (accessible via supabase-js client)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cron.schedule` with inline SQL for HTTP calls | `cron.schedule` with `net.http_post()` + Vault secrets | Supabase pg_net GA | Secrets not hardcoded in cron SQL. Vault is the standard. |
| GHL `message` field for email | GHL `html` field for email | Always was `html`, bug in early code | Empty email body if wrong field used. |
| Fixed 24h window for digest stats | `digest_runs` tracking table with `period_start`/`period_end` | Best practice | Prevents double-counting and handles skipped digests. |

**Deprecated/outdated:**
- Using `message` field for GHL email type: Never worked, use `html` field instead.
- Hardcoding secrets in pg_cron SQL: Use Vault's `decrypted_secrets` view instead.

## Open Questions

1. **GHL `emailFrom` requirement**
   - What we know: The `deliver-ghl` edge function uses `Deno.env.get('GHL_FROM_EMAIL') ?? 'leads@pplleads.com'` for the from address. The digest email needs a from address too.
   - What's unclear: Is the same from address appropriate for digest emails vs lead delivery emails?
   - Recommendation: Reuse the same `GHL_FROM_EMAIL` env var. If differentiation is needed later, add a separate env var.

2. **Digest for zero-activity days**
   - What we know: Some days (weekends) may have zero leads and zero deliveries.
   - What's unclear: Should the digest still send on zero-activity days?
   - Recommendation: Always send. "0 leads, 0 deliveries, 0 failures" is a valid morning summary. It confirms the system is running even when idle.

3. **Digest failure handling**
   - What we know: If the GHL API returns 429 or 5xx, the digest fails. pg_cron has no built-in retry.
   - What's unclear: Should there be a retry mechanism for failed digests?
   - Recommendation: Record `status: 'failed'` in `digest_runs` with `error_message`. Do NOT retry automatically. The admin will see the gap in digest history on the dashboard (if they check). A missed daily digest is low severity.

## Sources

### Primary (HIGH confidence)
- [Supabase Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) - pg_cron + pg_net exact SQL pattern for calling edge functions
- [Supabase Cron Docs](https://supabase.com/docs/guides/cron) - pg_cron scheduling, UTC-only behavior
- [pg_cron GitHub Issue #16](https://github.com/citusdata/pg_cron/issues/16) - UTC-only confirmed by upstream maintainer
- Existing codebase: `deliver-ghl/index.ts` - GHL email API with `html` field (lines 94-108), SMS with `message` field (lines 110-123)
- Existing codebase: `send-alert/index.ts` - Edge function + GHL SMS pattern (lines 88-99)
- Existing codebase: migration 00014 `notify_delivery_failed()` - pg_net + Vault pattern for calling edge functions from SQL
- Existing codebase: `src/lib/queries/dashboard.ts` `fetchDeliveryStats()` - Exact stats query pattern with 12 parallel counts
- Existing codebase: migration 00012 `admin_settings` - Admin GHL contact ID storage

### Secondary (MEDIUM confidence)
- [GHL Conversations API - Send a new message](https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message/index.html) - API endpoint docs (page didn't fully render, but fields verified from working codebase)
- [HTML Email Best Practices 2025](https://www.textmagic.com/blog/html-email-best-practices/) - Inline styles, table layout, web-safe fonts
- [HTML and CSS in Emails 2026](https://designmodo.com/html-css-emails/) - Current email client compatibility

### Tertiary (LOW confidence)
- None. All critical findings verified from codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already exist in the codebase. Zero new dependencies.
- Architecture: HIGH - Exact patterns proven in migrations 00011, 00014, and edge functions deliver-ghl, send-alert.
- Pitfalls: HIGH - pg_cron UTC issue verified from upstream GitHub issue + Supabase docs. GHL html vs message bug verified from actual production fix in this codebase.

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain, no fast-moving dependencies)
