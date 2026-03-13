# Phase 6: Alert Foundation - Research

**Researched:** 2026-03-13
**Domain:** Supabase Edge Functions, GHL Conversations API, Vault secrets, alert deduplication (SQL)
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ALRT-01 | Admin GHL contact ID stored in Supabase Vault for alert delivery | Vault `create_secret` pattern verified. `admin_settings` table + Vault secret together cover config + secret storage. Existing pattern in `fire_ghl_delivery()` reads from `vault.decrypted_secrets`. |
| ALRT-04 | Alert deduplication prevents duplicate SMS for same broker/reason within 15-minute window | `alert_state` table with composite key on `(alert_type, context_id)` + `last_sent_at` timestamp. pg_cron cleanup job prevents table bloat. Trigger checks dedup before pg_net call. |
| ALRT-05 | Reusable `send-alert` edge function serves both alert types via type discriminator | Single Deno edge function following existing `deliver-ghl/index.ts` pattern. Receives `type` field (`delivery_failed` or `unassigned_lead`), formats SMS body accordingly, sends via GHL Conversations API. |
</phase_requirements>

## Summary

Phase 6 builds the alert pipeline that later phases (Phase 7: Real-time Alerts) will wire triggers into. The scope is deliberately narrow: one database table (`admin_settings`), one Vault secret (`admin_ghl_contact_id`), one edge function (`send-alert`), one deduplication table (`alert_state`), and one cleanup cron job. No triggers are added in this phase. No existing code is modified.

The architecture is a direct clone of the existing `deliver-ghl` edge function pattern: SQL trigger (Phase 7) fires `pg_net.http_post` to the `send-alert` edge function, which calls GHL Conversations API to send SMS to the admin. The critical addition beyond the basic pipeline is deduplication. Without it, batch failures (10+ deliveries failing in one `process_webhook_retries()` cycle) would spam the admin with identical SMS messages and exhaust the shared GHL rate limit (100 req/10s). The dedup mechanism MUST exist before any triggers fire, which is why Phase 6 builds it and Phase 7 wires it.

The GHL Conversations API endpoint (`POST /conversations/messages`) is already proven in the codebase. The `deliver-ghl` edge function uses the exact same endpoint with `type: 'SMS'` and `type: 'Email'`. The `send-alert` function reuses the same API version header (`2021-07-28`), the same base URL (`https://services.leadconnectorhq.com`), and the same auth pattern (`Bearer {GHL_API_TOKEN}` from edge function env vars). The admin GHL contact ID (`llsWInEk2r7jRoxhPl5T`) is a known value that gets stored in Vault.

**Primary recommendation:** Build the `admin_settings` table + Vault secret first, then the `send-alert` edge function, then the `alert_state` dedup table with cleanup cron. Test by curl-invoking the edge function manually before wiring any triggers.

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| Supabase Edge Functions | Deno runtime | Host `send-alert` function | Already used for `deliver-ghl`. Same deployment, same env vars, same auth pattern. |
| GHL Conversations API | v2021-07-28 | Send SMS to admin contact | Already proven for lead delivery SMS/email. Same endpoint, same auth. |
| Supabase Vault | Built-in | Store `admin_ghl_contact_id` secret | Already stores `supabase_url` and `service_role_key`. Existing trigger functions read from `vault.decrypted_secrets`. |
| pg_cron | Built-in | Cleanup stale `alert_state` rows | Already running `check-delivery-responses` (30s) and `retry-failed-webhooks` (2min). Adding one weekly cleanup job. |
| pg_net | Built-in | Edge function invocation from SQL | Already used by `fire_ghl_delivery()` and `fire_outbound_webhook()`. Same `net.http_post` pattern. |

### Supporting
| Library/Tool | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| `@supabase/supabase-js` | v2 (via esm.sh) | Supabase client inside edge function | Only if edge function needs to query/update DB. For Phase 6, the edge function just calls GHL. Used in Phase 7+ when triggers pass context. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vault for contact ID | `admin_settings` table column (plaintext) | Contact ID is not truly secret (it's a GHL internal ID, not a credential). But Vault is the stated requirement (ALRT-01). Store in both: Vault for trigger functions, `admin_settings` for UI display. |
| Separate edge function per alert type | Single function with type discriminator | Two functions means two deployments, two cold starts, two auth checks. Single function with a `type` field is simpler and matches the requirement (ALRT-05). |
| `activity_log` for dedup tracking | Dedicated `alert_state` table | `activity_log` is append-only with no indexes for dedup queries. A dedicated table with proper indexes is cleaner and faster. |

**Installation:**
```bash
# No new npm packages needed for Phase 6
# Edge function uses esm.sh imports (Deno runtime)
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  functions/
    send-alert/
      index.ts              # New: Generic alert sender edge function
    deliver-ghl/
      index.ts              # Existing: Lead delivery edge function (untouched)
  migrations/
    00012_alert_foundation.sql  # New: admin_settings, alert_state, vault secret, cleanup cron
```

### Pattern 1: Edge Function for Alert Delivery
**What:** A single Deno edge function that receives an alert payload with a `type` discriminator, formats the SMS body based on type, and sends via GHL Conversations API.
**When to use:** Every alert in the system routes through this function.
**Example:**
```typescript
// Source: Existing deliver-ghl/index.ts pattern + GHL Conversations API docs
const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const { type, admin_contact_id, ...data } = await req.json()
  const ghlToken = Deno.env.get('GHL_API_TOKEN')
  if (!ghlToken) {
    return new Response(JSON.stringify({ error: 'GHL_API_TOKEN not configured' }), { status: 500 })
  }

  // Format SMS body based on alert type
  let message: string
  if (type === 'delivery_failed') {
    message = [
      'ALERT: Delivery failed permanently',
      `Lead: ${data.lead_name}`,
      `Broker: ${data.broker_name}`,
      `Channel: ${data.channel}`,
      `Error: ${data.error}`,
    ].join('\n')
  } else if (type === 'unassigned_lead') {
    message = [
      'ALERT: Lead unassigned',
      `Lead: ${data.lead_name}`,
      `Reason: ${data.reason}`,
    ].join('\n')
  } else {
    message = `ALERT: ${type}\n${JSON.stringify(data)}`
  }

  // Send SMS via GHL Conversations API
  const ghlResponse = await fetch(`${GHL_BASE_URL}/conversations/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ghlToken}`,
      'Version': GHL_API_VERSION,
    },
    body: JSON.stringify({
      type: 'SMS',
      contactId: admin_contact_id,
      message,
    }),
  })

  const ghlBody = await ghlResponse.json().catch(() => ({}))

  if (!ghlResponse.ok) {
    console.error('GHL SMS failed:', ghlResponse.status, ghlBody)
    return new Response(JSON.stringify({
      error: `ghl_${ghlResponse.status}`,
      detail: ghlBody,
    }), { status: ghlResponse.status === 429 ? 429 : 502 })
  }

  return new Response(JSON.stringify({
    success: true,
    messageId: ghlBody.messageId ?? ghlBody.id,
  }), { status: 200 })
})
```

### Pattern 2: Deduplication via `alert_state` Table
**What:** A simple table that tracks the last time an alert was sent for a given (alert_type, context_id) pair. Triggers check this table before firing pg_net calls.
**When to use:** Every alert trigger (Phase 7) checks dedup before sending.
**Example:**
```sql
-- Source: Codebase pattern from process_webhook_retries + Opsgenie dedup pattern
CREATE TABLE alert_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL,
  context_id text NOT NULL,          -- broker_id for failures, lead_id for unassigned
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  suppressed_count integer NOT NULL DEFAULT 0,
  last_payload jsonb,
  UNIQUE (alert_type, context_id)
);

CREATE INDEX idx_alert_state_lookup ON alert_state(alert_type, context_id, last_sent_at);
```

Dedup check pattern (used by triggers in Phase 7):
```sql
-- Check if alert was sent recently (15-minute window)
SELECT EXISTS (
  SELECT 1 FROM alert_state
  WHERE alert_type = 'delivery_failed'
    AND context_id = NEW.broker_id::text
    AND last_sent_at > now() - interval '15 minutes'
) INTO v_already_alerted;

IF v_already_alerted THEN
  -- Increment suppressed count instead of sending
  UPDATE alert_state
  SET suppressed_count = suppressed_count + 1,
      last_payload = NEW.details
  WHERE alert_type = 'delivery_failed'
    AND context_id = NEW.broker_id::text;
  RETURN NEW;
END IF;

-- Upsert alert state after sending
INSERT INTO alert_state (alert_type, context_id, last_sent_at, suppressed_count, last_payload)
VALUES ('delivery_failed', NEW.broker_id::text, now(), 0, NEW.details)
ON CONFLICT (alert_type, context_id)
DO UPDATE SET last_sent_at = now(), suppressed_count = 0, last_payload = EXCLUDED.last_payload;
```

### Pattern 3: Single-Row Admin Settings Table
**What:** A table constrained to exactly one row via unique index on `((true))`. Stores admin alert preferences.
**When to use:** Edge functions and trigger functions read this to know where to send alerts and which types are enabled.
**Example:**
```sql
-- Source: Codebase pattern (single-admin system, no multi-tenant)
CREATE TABLE admin_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_ghl_contact_id text NOT NULL,
  alert_sms_enabled boolean NOT NULL DEFAULT true,
  failure_alert_enabled boolean NOT NULL DEFAULT true,
  unassigned_alert_enabled boolean NOT NULL DEFAULT true,
  dedup_window_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enforce exactly one row
CREATE UNIQUE INDEX admin_settings_singleton ON admin_settings ((true));

-- Auto-update timestamp
CREATE TRIGGER admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed with known admin contact ID
INSERT INTO admin_settings (alert_ghl_contact_id)
VALUES ('llsWInEk2r7jRoxhPl5T');
```

### Pattern 4: Vault Secret for Sensitive ID
**What:** Store the admin GHL contact ID in Supabase Vault alongside the existing `supabase_url` and `service_role_key` secrets.
**When to use:** Trigger functions read from `vault.decrypted_secrets` when building pg_net payloads (same pattern as `fire_ghl_delivery()`).
**Example:**
```sql
-- Source: Existing fire_ghl_delivery() pattern + Supabase Vault docs
SELECT vault.create_secret('llsWInEk2r7jRoxhPl5T', 'admin_ghl_contact_id');

-- Reading in trigger function (same pattern as fire_ghl_delivery):
SELECT decrypted_secret INTO v_admin_contact
FROM vault.decrypted_secrets WHERE name = 'admin_ghl_contact_id';
```

### Anti-Patterns to Avoid
- **Calling GHL API directly from SQL trigger:** Use edge function as intermediary. SQL trigger -> pg_net -> edge function -> GHL. This keeps API token in edge function env vars (not Vault), enables proper error handling/logging, and makes the alert sender reusable.
- **Storing admin contact ID ONLY in `admin_settings` (not Vault):** ALRT-01 explicitly requires Vault storage. Trigger functions need Vault access since they can't read regular tables in some execution contexts. Store in both.
- **Dedup check inside the edge function:** The dedup MUST happen at the trigger/SQL level, before the pg_net call fires. Once pg_net fires, the edge function invocation is already in flight. Checking dedup in the edge function still wastes an edge function invocation per alert.
- **Using `activity_log` for dedup state:** `activity_log` has no suitable index and is append-only. Querying `WHERE event_type = X AND broker_id = Y AND created_at > interval` on a growing table is slow. Use a dedicated `alert_state` table with a composite unique index.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMS delivery to admin | Custom HTTP client with retry logic | GHL Conversations API via edge function (same as `deliver-ghl`) | Already proven in codebase. Same endpoint, same auth, same error patterns. |
| Alert deduplication | In-memory cache or edge function state | `alert_state` Postgres table with UPSERT | Postgres is the source of truth. Edge functions are stateless. In-memory dedup resets on cold start. |
| Secret storage | Environment variables or plaintext columns | Supabase Vault (`vault.create_secret`) | Already in use for `supabase_url` and `service_role_key`. Encrypted at rest. |
| Scheduled cleanup | Application-level setTimeout or node-cron | pg_cron (weekly job) | pg_cron already runs 2 jobs. Adding a weekly cleanup is trivial. Application code doesn't run 24/7. |

**Key insight:** Phase 6 is infrastructure that Phase 7 depends on. Every component here is a clone of an existing pattern in the codebase. The only genuinely new concept is the dedup table, and that's just a standard UPSERT + time-window check.

## Common Pitfalls

### Pitfall 1: Vault Secret Not Found Silently Fails Alert Pipeline
**What goes wrong:** The trigger function reads `admin_ghl_contact_id` from `vault.decrypted_secrets` and gets NULL because the secret was never created (or was created with a typo in the name). The function silently returns without sending an alert. Nobody notices alerts aren't working until they check manually.
**Why it happens:** Existing trigger functions (`fire_ghl_delivery`) have `IF v_supabase_url IS NULL THEN RETURN NEW` pattern. It's the right pattern for optional config, but for alerts, a missing secret means the entire alert system is broken.
**How to avoid:** (1) Seed the Vault secret in the migration itself. (2) Add an `admin_settings` row with the contact ID as a second source of truth. (3) The `send-alert` edge function should log an error (not silently return) when it receives a request without an `admin_contact_id`. (4) Phase 7 triggers should read from `admin_settings` first (fast table lookup), fall back to Vault.
**Warning signs:** Zero rows in `alert_state` after days of operation means either no alerts fired or they're all silently failing.

### Pitfall 2: GHL 429 Rate Limit on Alert SMS Cascades Into More Failures
**What goes wrong:** The `send-alert` edge function gets rate-limited (429) by GHL. If the caller (Phase 7 trigger via pg_net) doesn't handle this, the alert is lost. If too many alerts fire simultaneously during a batch failure, the rate limit blocks lead delivery SMS/email too (shared 100 req/10s budget).
**Why it happens:** Alert SMS and lead delivery SMS share the same GHL API token and location rate limit.
**How to avoid:** (1) The dedup mechanism (built in this phase) prevents more than 1 alert per broker per 15 minutes, dramatically reducing GHL API call volume. (2) The edge function should return 429 status so the caller knows it was rate-limited (not a permanent failure). (3) Do NOT retry rate-limited alerts. the dedup window means the next alert for the same broker will fire after 15 minutes anyway.
**Warning signs:** Edge function logs showing 429 responses from GHL.

### Pitfall 3: `admin_settings` Table Left Empty After Migration
**What goes wrong:** The migration creates the table but forgets to INSERT the initial row. Every query against `admin_settings` returns no rows. Triggers skip alerts because `SELECT * FROM admin_settings LIMIT 1` returns NOT FOUND.
**Why it happens:** Developer creates the table schema but defers data seeding to a "setup step" that never happens.
**How to avoid:** Include the `INSERT INTO admin_settings (alert_ghl_contact_id) VALUES ('llsWInEk2r7jRoxhPl5T')` directly in the migration. The singleton constraint ensures it can't be inserted twice.
**Warning signs:** `SELECT count(*) FROM admin_settings` returns 0.

### Pitfall 4: Edge Function Deployed Without GHL_API_TOKEN Env Var
**What goes wrong:** The `send-alert` function is deployed to Supabase but `GHL_API_TOKEN` is not set in the edge function secrets. Every call returns 500 with "GHL_API_TOKEN not configured."
**Why it happens:** The existing `deliver-ghl` function already has this env var set, but new edge functions need it set separately.
**How to avoid:** Document that `supabase secrets set GHL_API_TOKEN=...` must include the new `send-alert` function. Better: edge function secrets are global to all functions in the project (Supabase sets them for all functions, not per-function). So if `deliver-ghl` already has it, `send-alert` should too. Verify with `supabase functions list` and test with curl.
**Warning signs:** Edge function returning 500 on every invocation.

### Pitfall 5: Dedup Window Too Long or Too Short
**What goes wrong:** A 15-minute dedup window means if a broker's endpoint flaps (goes down, comes back, goes down again within 15 minutes), the second outage gets suppressed. If the window is too short (1 minute), batch failures still generate multiple alerts.
**Why it happens:** The 15-minute window is a design decision, not a technical constraint. It needs to balance alert fatigue vs responsiveness.
**How to avoid:** Make the window configurable via `admin_settings.dedup_window_minutes` (default 15). The trigger reads this value at runtime. Start with 15 minutes (matches the stated requirement in ALRT-04) and adjust based on real-world experience.
**Warning signs:** Admin complaining about too many alerts (reduce window) or too few (increase window).

## Code Examples

Verified patterns from the existing codebase:

### Reading Vault Secrets in SQL Functions
```sql
-- Source: supabase/migrations/00011_unified_deliveries.sql (fire_ghl_delivery function)
SELECT decrypted_secret INTO v_supabase_url
FROM vault.decrypted_secrets WHERE name = 'supabase_url';

SELECT decrypted_secret INTO v_service_key
FROM vault.decrypted_secrets WHERE name = 'service_role_key';

-- New for Phase 6:
SELECT decrypted_secret INTO v_admin_contact
FROM vault.decrypted_secrets WHERE name = 'admin_ghl_contact_id';
```

### Calling Edge Function via pg_net from SQL
```sql
-- Source: supabase/migrations/00011_unified_deliveries.sql (fire_ghl_delivery function)
PERFORM net.http_post(
  url := v_supabase_url || '/functions/v1/send-alert',
  body := jsonb_build_object(
    'type', 'delivery_failed',
    'admin_contact_id', v_admin_contact,
    'lead_name', v_lead_name,
    'broker_name', v_broker_name,
    'channel', v_channel,
    'error', v_error_message
  ),
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_service_key
  )
);
```

### GHL Conversations API SMS Send (from Edge Function)
```typescript
// Source: supabase/functions/deliver-ghl/index.ts (lines 110-123)
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
    message: smsBody,
  }),
})
```

### Edge Function Auth Pattern (Service Role Key)
```typescript
// Source: supabase/functions/deliver-ghl/index.ts (lines 64-68)
const authHeader = req.headers.get('Authorization')
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
}
```

### pg_cron Job Scheduling
```sql
-- Source: supabase/migrations/00010_retry_failed_webhooks.sql (lines 149-160)
-- Pattern for adding a cleanup job:
SELECT cron.schedule(
  'cleanup-alert-state',
  '0 0 * * 0',  -- Weekly Sunday midnight UTC
  $$DELETE FROM alert_state WHERE last_sent_at < now() - interval '7 days'$$
);
```

### Creating Vault Secret in Migration
```sql
-- Source: Supabase Vault docs (https://supabase.com/docs/guides/database/vault)
SELECT vault.create_secret('llsWInEk2r7jRoxhPl5T', 'admin_ghl_contact_id');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vault secret name as plain text in trigger | Vault + `admin_settings` table as dual source | This phase | Triggers read Vault (secure), UI displays from table (queryable) |
| No dedup (alert per event) | `alert_state` table with time-window dedup | This phase | Prevents alert storms from batch failures |
| One edge function per alert type | Single `send-alert` function with type discriminator | This phase (ALRT-05) | Simpler deployment, shared GHL logic, one cold start budget |

**Deprecated/outdated:**
- Event type `webhook_failed_permanent` (migration 00010) was renamed to `delivery_failed_permanent` (migration 00011) when the table was unified. Alert triggers in Phase 7 must use `delivery_failed_permanent`.

## Open Questions

1. **Should `admin_settings` store the contact ID in plaintext alongside Vault?**
   - What we know: ALRT-01 requires Vault storage. But the `admin_settings` table is more convenient for triggers to read (no Vault decryption overhead).
   - What's unclear: Whether the contact ID is truly sensitive. It's not an API key. It's an internal GHL record ID.
   - Recommendation: Store in BOTH places. Vault satisfies the requirement. `admin_settings` provides a fast lookup for triggers and a UI-queryable source. Seed both in the same migration.

2. **Edge function env var sharing across functions**
   - What we know: Supabase edge function secrets are set project-wide (not per function). If `deliver-ghl` has `GHL_API_TOKEN`, `send-alert` should inherit it automatically.
   - What's unclear: Whether there are edge cases where a newly deployed function doesn't see existing secrets.
   - Recommendation: After deploying `send-alert`, verify with a curl test that `GHL_API_TOKEN` is accessible. Include the test command in the plan.

3. **RLS policy for `admin_settings` and `alert_state`**
   - What we know: The system uses anon key for the Next.js frontend. Existing tables have RLS with "Allow anon read access" policies.
   - What's unclear: Should `admin_settings` be readable by the frontend? Should `alert_state` be queryable for dashboard display?
   - Recommendation: Enable RLS on both tables. `admin_settings`: anon read (dashboard might show alert config). `alert_state`: anon read (dashboard could show suppressed alert counts). No write access via anon. triggers run as SECURITY DEFINER.

## Sources

### Primary (HIGH confidence)
- `supabase/functions/deliver-ghl/index.ts` - Exact edge function pattern to replicate (GHL API call, auth, error handling)
- `supabase/migrations/00011_unified_deliveries.sql` - `fire_ghl_delivery()` trigger function (Vault read pattern, pg_net call pattern, `delivery_failed_permanent` event type)
- `supabase/migrations/00010_retry_failed_webhooks.sql` - pg_cron schedule pattern, `process_webhook_retries()` bulk failure behavior
- `supabase/migrations/00003_create_tables.sql` - `unassigned_queue` schema (columns: lead_id, reason, details, resolved), `activity_log` schema
- `src/components/realtime-listener.tsx` - Existing Realtime subscriptions (deliveries, activity_log, unassigned_queue)
- `src/lib/ghl/client.ts` - GHL API constants and SMS send pattern (app-layer reference)
- [Supabase Vault docs](https://supabase.com/docs/guides/database/vault) - `vault.create_secret`, `vault.decrypted_secrets` view
- [Supabase Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) - pg_cron + pg_net to edge function pattern

### Secondary (MEDIUM confidence)
- [GHL Send Message API](https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message/index.html) - SMS message endpoint, contactId field
- [Supabase Vault + pg_cron auth pattern](https://github.com/orgs/supabase/discussions/21791) - Using Vault secrets as Bearer token for edge function calls
- [Alert deduplication patterns (Opsgenie)](https://support.atlassian.com/opsgenie/docs/what-is-alert-de-duplication/) - Time-window dedup with suppressed count tracking

### Tertiary (LOW confidence)
- None. All findings verified against codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Every component is already in use in the codebase. Zero new dependencies.
- Architecture: HIGH - The `send-alert` function is a simplified clone of `deliver-ghl`. The Vault/pg_net/edge function pattern is proven in migration 00011.
- Pitfalls: HIGH - Alert storm and rate limit pitfalls verified against actual `process_webhook_retries()` code (batch failures are real). Dedup mechanism addresses them directly.

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days, stable domain)
