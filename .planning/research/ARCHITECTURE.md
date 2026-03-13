# Architecture: v1.1 Monitoring & Alerting Integration

**Domain:** Monitoring, alerting, and daily digest features for existing lead management system
**Researched:** 2026-03-13
**Confidence:** HIGH

## System Overview: How v1.1 Fits Into Existing Architecture

The existing system has four layers: Ingestion, Assignment Engine, Delivery, and Presentation. v1.1 adds a **fifth layer (Monitoring & Alerting)** that hooks into existing touchpoints without modifying any core logic.

```
                     EXISTING SYSTEM (unchanged)
    +----------------------------------------------------------+
    |  INGESTION: POST /api/leads/incoming -> assign_lead()    |
    +---------------------------+------------------------------+
                                |
                                v
    +----------------------------------------------------------+
    |  ASSIGNMENT ENGINE: assign_lead() Postgres function       |
    |  -> INSERT into deliveries (triggers fire_outbound_webhook|
    |     and fire_ghl_delivery)                                |
    |  -> INSERT into unassigned_queue (if no match)            |
    +---------------------------+------------------------------+
                                |
                                v
    +----------------------------------------------------------+
    |  DELIVERY LAYER: pg_net + pg_cron retries                 |
    |  -> check_delivery_responses (30s)                        |
    |  -> process_webhook_retries (2min) -> marks failed_perm   |
    +---------------------------+------------------------------+
                                |
                                v
    +==========================================================+
    |  NEW: MONITORING & ALERTING LAYER (v1.1)                 |
    |                                                          |
    |  1. Delivery Stats Dashboard                             |
    |     -> New query: fetchDeliveryStats()                   |
    |     -> New component: <DeliveryStats />                  |
    |     -> Wired into existing RealtimeListener              |
    |                                                          |
    |  2. Failure Alerts                                       |
    |     -> New trigger: trg_alert_delivery_failed            |
    |     -> Fires on deliveries UPDATE to 'failed_permanent'  |
    |     -> Calls NEW edge function: send-alert               |
    |                                                          |
    |  3. Daily Digest                                         |
    |     -> New pg_cron job: daily-digest (8AM Pacific)       |
    |     -> Calls NEW edge function: daily-digest             |
    |     -> Sends summary via GHL email + SMS                 |
    |                                                          |
    |  4. Unassigned Lead Alerts                               |
    |     -> New trigger: trg_alert_unassigned_lead            |
    |     -> Fires on unassigned_queue INSERT                  |
    |     -> Calls NEW edge function: send-alert (reused)      |
    +==========================================================+
```

## Component Inventory: New vs Modified

### New Components (create from scratch)

| Component | Type | File/Location | Purpose |
|-----------|------|---------------|---------|
| `send-alert` edge function | Supabase Edge Function | `supabase/functions/send-alert/index.ts` | Generic alert sender: receives alert type + payload, sends GHL SMS to admin |
| `daily-digest` edge function | Supabase Edge Function | `supabase/functions/daily-digest/index.ts` | Queries stats, builds digest, sends GHL email + SMS |
| `trg_alert_delivery_failed` | DB Trigger + Function | Migration SQL | Fires on deliveries UPDATE to `failed_permanent`, calls send-alert |
| `trg_alert_unassigned_lead` | DB Trigger + Function | Migration SQL | Fires on unassigned_queue INSERT, calls send-alert |
| `fetchDeliveryStats()` | Server query | `src/lib/queries/dashboard.ts` (add to existing) | Queries today's delivery counts by status and channel |
| `<DeliveryStats />` | React component | `src/components/dashboard/delivery-stats.tsx` | Renders delivery KPIs (sent, failed, per channel) |
| Vault secret: `admin_ghl_contact_id` | Config | Supabase Vault | Admin's GHL contact ID for receiving alert SMS/email |
| pg_cron job: `daily-digest` | Scheduled job | Migration SQL | Calls daily-digest edge function at 8 AM Pacific daily |

### Modified Components (add to existing)

| Component | File | What Changes |
|-----------|------|--------------|
| Dashboard page | `src/app/(dashboard)/page.tsx` | Add `<DeliveryStats />` section below KPI cards |
| Dashboard queries | `src/lib/queries/dashboard.ts` | Add `fetchDeliveryStats()` function |
| RealtimeListener | `src/components/realtime-listener.tsx` | Already subscribes to `deliveries` table. No changes needed. |

### Untouched Components (explicitly no modifications)

| Component | Why Untouched |
|-----------|---------------|
| `assign_lead()` function | Assignment logic unchanged. Monitoring hooks into outputs, not internals. |
| `fire_outbound_webhook()` trigger | Delivery firing unchanged. Alerts trigger on outcome (failed_permanent), not on send. |
| `fire_ghl_delivery()` trigger | Same. Unchanged. |
| `process_webhook_retries()` | Already marks `failed_permanent` and logs to `activity_log`. Alerts fire from the status change, not from this function. |
| `deliver-ghl` edge function | Existing broker delivery. Unchanged. The new `send-alert` is a separate function. |
| `src/lib/ghl/client.ts` | Only used by app-layer dispatcher fallback. Edge functions use their own GHL calls. |

## Feature 1: Delivery Stats Dashboard

### Data Flow

```
Admin opens dashboard
    |
    v
Server Component (page.tsx)
    | fetchDeliveryStats() -> Supabase query on deliveries table
    | WHERE created_at >= start_of_today
    | GROUP BY status, channel
    v
<DeliveryStats /> renders:
    | - Total deliveries today
    | - Sent (successful)
    | - Failed permanent
    | - By channel: crm_webhook / email / sms
    v
RealtimeListener (already subscribed to deliveries table)
    | On any deliveries change -> router.refresh()
    | Server Component re-fetches -> UI updates
```

### Implementation Details

**New query in `src/lib/queries/dashboard.ts`:**

```typescript
export async function fetchDeliveryStats() {
  const supabase = createAdminClient()
  const todayStart = startOfDay(new Date()).toISOString()

  const { data } = await supabase
    .from('deliveries')
    .select('status, channel')
    .gte('created_at', todayStart)

  // Aggregate in JS (simpler than SQL group-by through Supabase client)
  const stats = {
    total: data?.length ?? 0,
    sent: 0,
    failed: 0,
    failedPermanent: 0,
    byChannel: { crm_webhook: 0, email: 0, sms: 0 },
  }

  for (const d of data ?? []) {
    if (d.status === 'sent') stats.sent++
    if (d.status === 'failed' || d.status === 'retrying') stats.failed++
    if (d.status === 'failed_permanent') stats.failedPermanent++
    stats.byChannel[d.channel as keyof typeof stats.byChannel]++
  }

  return stats
}
```

**New component `src/components/dashboard/delivery-stats.tsx`:** A row of mini-cards showing today's delivery metrics. Uses the same ShadCN Card pattern as existing `<KpiCards />`. Highlight `failedPermanent` in red/amber if > 0.

**Dashboard page change (`src/app/(dashboard)/page.tsx`):** Add `fetchDeliveryStats()` to the existing `Promise.all()` call and render `<DeliveryStats data={deliveryStats} />` between KpiCards and the chart/activity grid.

**Realtime:** Already handled. The existing `RealtimeListener` subscribes to `deliveries` table changes and calls `router.refresh()`, which re-runs the server component and re-fetches stats. Zero new realtime code needed.

### Files Changed

| File | Action |
|------|--------|
| `src/lib/queries/dashboard.ts` | ADD `fetchDeliveryStats()` |
| `src/components/dashboard/delivery-stats.tsx` | CREATE new component |
| `src/app/(dashboard)/page.tsx` | MODIFY: add stats fetch + render |

---

## Feature 2: Failure Alerts (SMS to Admin)

### Data Flow

```
process_webhook_retries() marks delivery as failed_permanent
    |
    | UPDATE deliveries SET status = 'failed_permanent'
    v
DB Trigger: trg_alert_delivery_failed
    | Fires AFTER UPDATE on deliveries
    | WHERE NEW.status = 'failed_permanent' AND OLD.status != 'failed_permanent'
    |
    | Reads admin_ghl_contact_id from Vault
    | Reads supabase_url + service_role_key from Vault
    |
    | Calls pg_net -> send-alert edge function
    v
Edge Function: send-alert
    | Receives: { type: 'delivery_failed', delivery_id, lead_name, broker_name, channel, error }
    | Builds SMS body: "ALERT: Delivery failed for [lead] to [broker] via [channel]. Error: [msg]"
    | Sends SMS via GHL Conversations API to admin contact
    v
Admin receives SMS on phone
```

### Trigger Function (SQL)

```sql
CREATE OR REPLACE FUNCTION alert_delivery_failed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_admin_contact text;
  v_lead record;
  v_broker record;
BEGIN
  -- Only fire on transition TO failed_permanent
  IF NEW.status != 'failed_permanent' OR OLD.status = 'failed_permanent' THEN
    RETURN NEW;
  END IF;

  -- Get vault secrets
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  SELECT decrypted_secret INTO v_admin_contact
  FROM vault.decrypted_secrets WHERE name = 'admin_ghl_contact_id';

  IF v_supabase_url IS NULL OR v_service_key IS NULL OR v_admin_contact IS NULL THEN
    RETURN NEW; -- silently skip if not configured
  END IF;

  -- Get lead + broker names for the alert message
  SELECT first_name, last_name INTO v_lead FROM leads WHERE id = NEW.lead_id;
  SELECT first_name, last_name INTO v_broker FROM brokers WHERE id = NEW.broker_id;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-alert',
    body := jsonb_build_object(
      'type', 'delivery_failed',
      'admin_contact_id', v_admin_contact,
      'delivery_id', NEW.id,
      'lead_name', COALESCE(v_lead.first_name || ' ' || v_lead.last_name, 'Unknown'),
      'broker_name', COALESCE(v_broker.first_name || ' ' || v_broker.last_name, 'Unknown'),
      'channel', NEW.channel,
      'error', NEW.error_message
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_delivery_failed
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION alert_delivery_failed();
```

### Edge Function: send-alert

```typescript
// supabase/functions/send-alert/index.ts
// Generic alert sender. Receives alert type + payload, sends GHL SMS.
// Reused by both failure alerts and unassigned lead alerts.

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const { type, admin_contact_id, ...data } = await req.json()
  const ghlToken = Deno.env.get('GHL_API_TOKEN')

  // Build SMS body based on alert type
  let message: string
  if (type === 'delivery_failed') {
    message = `ALERT: Delivery failed permanently\nLead: ${data.lead_name}\nBroker: ${data.broker_name}\nChannel: ${data.channel}\nError: ${data.error}`
  } else if (type === 'unassigned_lead') {
    message = `ALERT: Lead unassigned\nLead: ${data.lead_name}\nReason: ${data.reason}`
  } else {
    message = `ALERT: ${type}\n${JSON.stringify(data)}`
  }

  // Send SMS via GHL
  const ghlResponse = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ghlToken}`,
      'Version': '2021-07-28',
    },
    body: JSON.stringify({
      type: 'SMS',
      contactId: admin_contact_id,
      message,
    }),
  })

  return new Response(JSON.stringify({ success: ghlResponse.ok }), { status: ghlResponse.ok ? 200 : 502 })
})
```

### Key Design Decision: Why a Separate Edge Function (Not Inline in Trigger)

The trigger function uses `pg_net` to call the `send-alert` edge function rather than calling GHL directly from SQL. Reasons:

1. **GHL API token is stored in edge function env vars**, not in Vault. The existing `deliver-ghl` function follows this pattern. Consistency.
2. **Error handling in Deno is better than in pg_net.** pg_net fire-and-forget with no response handling. Edge function can log errors, handle rate limits.
3. **Reusable.** Same `send-alert` function serves failure alerts AND unassigned alerts. Different `type` field, same endpoint.

### Files Changed

| File | Action |
|------|--------|
| Migration SQL (new file) | CREATE trigger function + trigger |
| `supabase/functions/send-alert/index.ts` | CREATE new edge function |
| Vault config | ADD `admin_ghl_contact_id` secret |

---

## Feature 3: Daily Digest

### Data Flow

```
pg_cron fires at 8:00 AM Pacific (15:00 UTC, 3:00 PM PKT)
    |
    | Calls pg_net -> daily-digest edge function
    v
Edge Function: daily-digest
    | 1. Queries Supabase for last 24h stats:
    |    - Leads received (count from leads table)
    |    - Leads assigned vs unassigned
    |    - Deliveries: sent, failed, failed_permanent per channel
    |    - Unassigned queue entries still unresolved
    |
    | 2. Builds email HTML + SMS summary
    |
    | 3. Reads admin_ghl_contact_id from request body (passed by pg_cron)
    |
    | 4. Sends GHL email (detailed HTML) + SMS (summary one-liner)
    v
Admin receives morning email + SMS digest
```

### pg_cron Schedule (SQL)

```sql
-- 8 AM Pacific = 15:00 UTC (during PDT)
-- 8 AM Pacific = 16:00 UTC (during PST)
-- Use 15:00 UTC for PDT (March-November) since that's the majority of the year.
-- Adjust manually if needed during winter months, or use 16:00 UTC for PST.
SELECT cron.schedule(
  'daily-digest',
  '0 15 * * *',  -- 15:00 UTC = 8:00 AM Pacific (PDT)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'admin_contact_id', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'admin_ghl_contact_id')
    )
  ) AS request_id;
  $$
);
```

### Edge Function: daily-digest

```typescript
// supabase/functions/daily-digest/index.ts
// Queries last 24h stats and sends morning summary via GHL email + SMS.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const { admin_contact_id } = await req.json()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ghlToken = Deno.env.get('GHL_API_TOKEN')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Query stats
  const [leadsRes, deliveriesRes, unassignedRes] = await Promise.all([
    supabase.from('leads').select('status').gte('created_at', since),
    supabase.from('deliveries').select('status, channel').gte('created_at', since),
    supabase.from('unassigned_queue').select('id').eq('resolved', false),
  ])

  // Aggregate
  const leads = leadsRes.data ?? []
  const deliveries = deliveriesRes.data ?? []
  const totalLeads = leads.length
  const assigned = leads.filter(l => l.status === 'assigned').length
  const unassigned = leads.filter(l => l.status === 'unassigned').length
  const sent = deliveries.filter(d => d.status === 'sent').length
  const failedPerm = deliveries.filter(d => d.status === 'failed_permanent').length
  const pendingUnassigned = unassignedRes.data?.length ?? 0

  // Build SMS
  const smsBody = [
    `Daily Digest (${new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })})`,
    `Leads: ${totalLeads} in | ${assigned} assigned | ${unassigned} unassigned`,
    `Deliveries: ${sent} sent | ${failedPerm} failed`,
    pendingUnassigned > 0 ? `Unresolved queue: ${pendingUnassigned}` : '',
  ].filter(Boolean).join('\n')

  // Build email HTML (detailed breakdown by channel, etc.)
  const emailHtml = buildDigestEmail({ totalLeads, assigned, unassigned, deliveries, pendingUnassigned, sent, failedPerm })

  // Send both email and SMS
  const ghlHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ghlToken}`,
    'Version': '2021-07-28',
  }

  await Promise.allSettled([
    fetch('https://services.leadconnectorhq.com/conversations/messages', {
      method: 'POST',
      headers: ghlHeaders,
      body: JSON.stringify({ type: 'SMS', contactId: admin_contact_id, message: smsBody }),
    }),
    fetch('https://services.leadconnectorhq.com/conversations/messages', {
      method: 'POST',
      headers: ghlHeaders,
      body: JSON.stringify({
        type: 'Email',
        contactId: admin_contact_id,
        subject: `PPL Daily Digest - ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}`,
        html: emailHtml,
        emailFrom: Deno.env.get('GHL_FROM_EMAIL') ?? 'leads@pplleads.com',
      }),
    }),
  ])

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

### Timezone Consideration

pg_cron runs in UTC. 8 AM Pacific is:
- **15:00 UTC** during PDT (second Sunday of March through first Sunday of November)
- **16:00 UTC** during PST (November through March)

Two options:
1. **Simple:** Use `0 15 * * *` and accept the digest arrives at 7 AM Pacific during winter. Good enough.
2. **Exact:** Schedule two jobs and have the edge function check if one should skip based on current Pacific time. Over-engineered for an internal tool.

**Recommendation:** Use `0 15 * * *`. Admin gets the digest at 8 AM Pacific most of the year, 7 AM Pacific in winter. Not worth the complexity to be DST-exact.

### Files Changed

| File | Action |
|------|--------|
| Migration SQL (new file) | CREATE pg_cron schedule |
| `supabase/functions/daily-digest/index.ts` | CREATE new edge function |
| Vault config | Uses existing `supabase_url`, `service_role_key`, `admin_ghl_contact_id` |

---

## Feature 4: Unassigned Lead Alerts

### Data Flow

```
assign_lead() finds no matching order
    |
    | INSERT INTO unassigned_queue (lead_id, reason, details)
    v
DB Trigger: trg_alert_unassigned_lead
    | Fires AFTER INSERT on unassigned_queue
    |
    | Reads admin_ghl_contact_id from Vault
    | Reads supabase_url + service_role_key from Vault
    | Reads lead name from leads table
    |
    | Calls pg_net -> send-alert edge function (REUSED from Feature 2)
    v
Edge Function: send-alert
    | Receives: { type: 'unassigned_lead', lead_name, reason }
    | Builds SMS: "ALERT: Lead unassigned - [name]. Reason: [reason]"
    | Sends SMS via GHL to admin
    v
Admin receives SMS immediately
```

### Trigger Function (SQL)

```sql
CREATE OR REPLACE FUNCTION alert_unassigned_lead()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_admin_contact text;
  v_lead record;
BEGIN
  -- Get vault secrets
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  SELECT decrypted_secret INTO v_admin_contact
  FROM vault.decrypted_secrets WHERE name = 'admin_ghl_contact_id';

  IF v_supabase_url IS NULL OR v_service_key IS NULL OR v_admin_contact IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get lead name
  SELECT first_name, last_name INTO v_lead FROM leads WHERE id = NEW.lead_id;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-alert',
    body := jsonb_build_object(
      'type', 'unassigned_lead',
      'admin_contact_id', v_admin_contact,
      'lead_name', COALESCE(v_lead.first_name || ' ' || v_lead.last_name, 'Unknown'),
      'reason', COALESCE(NEW.details, NEW.reason)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_unassigned_lead
  AFTER INSERT ON unassigned_queue
  FOR EACH ROW
  EXECUTE FUNCTION alert_unassigned_lead();
```

### Files Changed

| File | Action |
|------|--------|
| Migration SQL (same file as Feature 2 trigger or separate) | CREATE trigger function + trigger |
| `supabase/functions/send-alert/index.ts` | REUSED (already created in Feature 2) |

---

## Shared Infrastructure: Vault Configuration

All alert features depend on the admin's GHL contact ID being in Vault. This is the one new secret that needs to be added.

```sql
-- Run once in Supabase SQL Editor (or add to migration)
SELECT vault.create_secret('ADMIN_GHL_CONTACT_ID_VALUE', 'admin_ghl_contact_id');
```

**Existing Vault secrets (already configured, reused):**
- `supabase_url` - Used by all trigger functions to call edge functions
- `service_role_key` - Used as Bearer token for edge function auth

**New Vault secret:**
- `admin_ghl_contact_id` - Admin's GHL contact ID for receiving alert SMS/email

The admin's GHL contact ID must be the contact ID in the GHL main sub-account (same account that sends leads). This is the contact record that GHL uses to route SMS/email to the admin's phone/inbox.

---

## Complete File Manifest

### New Files to Create

| File | Type | Size Estimate |
|------|------|---------------|
| `supabase/functions/send-alert/index.ts` | Edge Function | ~60 lines |
| `supabase/functions/daily-digest/index.ts` | Edge Function | ~120 lines |
| `supabase/migrations/00012_monitoring_alerts.sql` | SQL Migration | ~120 lines |
| `src/components/dashboard/delivery-stats.tsx` | React Component | ~80 lines |

### Existing Files to Modify

| File | Change | Size of Change |
|------|--------|----------------|
| `src/lib/queries/dashboard.ts` | Add `fetchDeliveryStats()` | ~25 lines added |
| `src/app/(dashboard)/page.tsx` | Add stats fetch + render | ~5 lines changed |

### Migration File Contents (00012_monitoring_alerts.sql)

This single migration file contains:
1. `alert_delivery_failed()` trigger function + trigger
2. `alert_unassigned_lead()` trigger function + trigger
3. pg_cron schedule for daily-digest
4. Comment noting `admin_ghl_contact_id` Vault secret requirement

---

## Build Order (Suggested)

Dependencies between the 4 features:

```
Feature 2 (Failure Alerts) --+
                              +--> Both need send-alert edge function
Feature 4 (Unassigned Alerts)-+

Feature 1 (Delivery Stats) ----> Independent, no deps on other features

Feature 3 (Daily Digest) ------> Independent, but benefits from having
                                  other features deployed first (validates
                                  Vault config, GHL contact ID, etc.)
```

### Recommended Build Order

**Phase A: Foundation (do first)**
1. Add `admin_ghl_contact_id` to Vault
2. Create `send-alert` edge function
3. Test: manually invoke send-alert with curl to verify GHL SMS works

**Phase B: Real-time Alerts (highest value)**
4. Create `alert_delivery_failed()` trigger (Feature 2)
5. Create `alert_unassigned_lead()` trigger (Feature 4)
6. Test: create a delivery that fails permanently, verify SMS received
7. Test: create a lead with no matching order, verify SMS received

**Phase C: Dashboard Stats (visual, low risk)**
8. Add `fetchDeliveryStats()` query
9. Create `<DeliveryStats />` component
10. Wire into dashboard page
11. Test: verify stats render, verify realtime updates on delivery changes

**Phase D: Daily Digest (scheduled, test last)**
12. Create `daily-digest` edge function
13. Create pg_cron schedule
14. Test: manually invoke edge function, verify email + SMS content
15. Wait for next scheduled run to verify pg_cron fires correctly

### Build Order Rationale

- **send-alert first** because Features 2 and 4 both depend on it. Build and test the alert pipeline before wiring up triggers.
- **Alerts before dashboard stats** because alerts are the highest-value feature (admin finds out about failures immediately vs looking at a dashboard).
- **Dashboard stats after alerts** because it's purely additive UI work with no backend dependencies beyond the existing deliveries table.
- **Daily digest last** because it depends on pg_cron scheduling (harder to test, requires waiting for the schedule to fire) and benefits from having the Vault config proven by the alert features.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Alert Storm from Batch Failures

**What could go wrong:** If a broker's webhook endpoint goes down, all their deliveries fail within minutes. Each `failed_permanent` transition fires a trigger, sending dozens of SMS alerts to admin.

**Prevention:** Add a simple throttle in the trigger function. Check if an alert for the same broker was sent in the last 5 minutes. If so, skip.

```sql
-- In alert_delivery_failed(), before sending:
IF EXISTS (
  SELECT 1 FROM activity_log
  WHERE event_type = 'alert_delivery_failed'
    AND broker_id = NEW.broker_id
    AND created_at > now() - interval '5 minutes'
) THEN
  RETURN NEW; -- throttled
END IF;

-- After sending, log the alert:
INSERT INTO activity_log (event_type, lead_id, broker_id, order_id, details)
VALUES ('alert_delivery_failed', NEW.lead_id, NEW.broker_id, NEW.order_id,
  jsonb_build_object('delivery_id', NEW.id, 'channel', NEW.channel));
```

### Anti-Pattern 2: Calling GHL Directly from SQL Trigger

**What people do:** Use `pg_net` to call the GHL API directly from the trigger function, skipping the edge function.

**Why it's wrong:** GHL API token would need to be in Vault (another secret to manage). Error handling in pg_net is fire-and-forget. No logging. No rate limit handling. The edge function centralizes GHL API logic with proper error handling.

**Do this instead:** Always route through an edge function. SQL trigger -> pg_net -> edge function -> GHL API.

### Anti-Pattern 3: Polling for Stats in the Dashboard

**What people do:** `setInterval(() => refetchStats(), 5000)` to update delivery numbers.

**Why it's wrong:** The existing RealtimeListener already handles this. It subscribes to `deliveries` table changes and calls `router.refresh()`, which re-runs the server component. No polling needed.

### Anti-Pattern 4: Fat Daily Digest Query in pg_cron SQL

**What people do:** Write the entire stats aggregation query inline in the pg_cron schedule, then try to format the email in SQL.

**Why it's wrong:** SQL is terrible for string formatting. Error handling is impossible. Debugging is painful.

**Do this instead:** pg_cron calls the edge function with minimal payload. Edge function queries Supabase, aggregates, formats, and sends. TypeScript is the right tool for message formatting.

---

## Scalability Considerations

| Concern | Current Scale | At 1K leads/day | Notes |
|---------|--------------|-----------------|-------|
| Alert SMS volume | 0-5 alerts/day | 10-50/day worst case | Throttle prevents storm. GHL SMS rate limits apply. |
| Dashboard stats query | Trivial (< 100 rows/day) | ~1K rows scanned | Add index on `deliveries(created_at)` if slow. Currently indexed on status only. |
| Daily digest query | 1 query/day | Same | Window is always 24h. Constant cost regardless of scale. |
| Trigger overhead | Negligible | Negligible | pg_net calls are async. Trigger returns immediately. |

---

## Sources

- [Supabase Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) - pg_cron + pg_net pattern for calling edge functions (HIGH confidence)
- [Supabase Cron Quickstart](https://supabase.com/docs/guides/cron/quickstart) - Cron expression syntax, daily scheduling examples (HIGH confidence)
- [Supabase Vault Docs](https://supabase.com/docs/guides/database/vault) - Storing and retrieving secrets with `vault.decrypted_secrets` (HIGH confidence)
- [Supabase Vault + pg_cron Discussion](https://github.com/orgs/supabase/discussions/21791) - Pattern for using vault secrets in pg_cron -> edge function auth (MEDIUM confidence)
- [Supabase Vault + pg_cron Auth Pattern](https://github.com/supabase/cli/issues/4287) - Recommended auth pattern for pg_cron to edge function calls (MEDIUM confidence)
- Existing codebase analysis: `fire_ghl_delivery()` trigger, `deliver-ghl` edge function, `process_webhook_retries()`, `RealtimeListener` component (HIGH confidence, verified by reading actual code)

---
*Architecture research for: PPL Lead Management v1.1 Monitoring & Alerting*
*Researched: 2026-03-13*
