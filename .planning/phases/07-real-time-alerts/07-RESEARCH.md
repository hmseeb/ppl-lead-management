# Phase 7: Real-time Alerts - Research

**Researched:** 2026-03-13
**Domain:** PostgreSQL triggers, pg_net async HTTP, alert deduplication, Supabase Edge Functions
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ALRT-02 | SMS alert fires when delivery hits failed_permanent, includes lead name, broker name, channel, error | Trigger on `deliveries` UPDATE with `WHEN (OLD.status IS DISTINCT FROM 'failed_permanent' AND NEW.status = 'failed_permanent')`. Trigger function JOINs `leads` and `brokers` tables for names. Checks `alert_state` dedup before `pg_net.http_post` to `send-alert` edge function. |
| ALRT-03 | SMS alert fires when lead goes to unassigned queue, includes lead details and match failure reason | Trigger on `unassigned_queue` AFTER INSERT. Trigger function JOINs `leads` table for name/details. Uses `NEW.reason` and `NEW.details` for match failure reason. Checks `alert_state` dedup (context_id = lead_id) before `pg_net.http_post`. |
</phase_requirements>

## Summary

Phase 7 wires two database triggers into the infrastructure that Phase 6 built (`admin_settings`, `alert_state`, `send-alert` edge function). No new tables, no new edge functions, no npm packages. The entire phase is a single SQL migration file containing two trigger functions and two trigger definitions.

The critical complexity is getting the triggers right without creating cascade issues with the three existing triggers on the `deliveries` table (`deliveries_updated_at`, `trg_fire_outbound_webhook`, `trg_fire_ghl_delivery`). The delivery failure trigger fires on UPDATE (status change to `failed_permanent`), which is a different event than INSERT (where the existing triggers fire). This eliminates cascade risk entirely. The unassigned queue trigger fires on INSERT, and there are zero existing triggers on `unassigned_queue`, so no cascade risk there either.

Both trigger functions follow the same pattern: (1) read `admin_settings` for config + enabled flags, (2) check `alert_state` for dedup, (3) JOIN related tables for human-readable names, (4) read Vault secrets for `supabase_url` and `service_role_key`, (5) call `pg_net.http_post` to `send-alert` edge function, (6) UPSERT `alert_state` to record the sent alert. The functions must be `SECURITY DEFINER` because `alert_state` has no write RLS policy for anon.

**Primary recommendation:** Create a single migration (00014) with two SECURITY DEFINER trigger functions and two trigger definitions. Use `WHEN` clause on the delivery trigger to limit firing to status transitions to `failed_permanent`. Test both triggers by manually inserting/updating rows before considering the phase complete.

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| PostgreSQL triggers | Built-in | Fire on `deliveries` UPDATE and `unassigned_queue` INSERT | Already used for `fire_outbound_webhook`, `fire_ghl_delivery`, `update_updated_at`. Same pattern, different event. |
| pg_net | Built-in | Async HTTP POST to `send-alert` edge function | Already used by `fire_ghl_delivery()` and `fire_outbound_webhook()`. Identical call pattern. |
| Supabase Vault | Built-in | Read `supabase_url`, `service_role_key`, `admin_ghl_contact_id` | Already used by `fire_ghl_delivery()`. Same `vault.decrypted_secrets` read pattern. |
| `alert_state` table | Phase 6 | Dedup check before sending alert | Created in migration 00013. Composite key on `(alert_type, context_id)`. |
| `admin_settings` table | Phase 6 | Read admin config (enabled flags, dedup window, contact ID) | Created in migration 00012. Singleton row with `dedup_window_minutes` and per-type enabled flags. |
| `send-alert` edge function | Phase 6 | Receive alert payload, format SMS, send via GHL | Created in Phase 6. Accepts `type`, `admin_contact_id`, plus type-specific fields. |

### Supporting
| Library/Tool | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| `admin_settings.alert_ghl_contact_id` | Phase 6 | Fast lookup of admin contact ID without Vault decryption | Primary source for contact ID in trigger. Faster than Vault read. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DB trigger on deliveries UPDATE | pg_cron polling for failed_permanent | Trigger gives sub-second response. pg_cron minimum is 1 second. Trigger is the right choice for real-time alerts. |
| SECURITY DEFINER functions | Granting INSERT on alert_state to anon | SECURITY DEFINER is the existing pattern (used by all trigger functions). Granting write to anon is a security regression. |
| Reading admin_settings in trigger | Hardcoding admin contact ID | admin_settings makes it configurable. Hardcoding means redeploying a migration to change config. |

**Installation:**
```bash
# No new packages needed. Phase 7 is purely a SQL migration.
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  migrations/
    00014_alert_triggers.sql       # NEW: Both trigger functions + trigger definitions
  functions/
    send-alert/
      index.ts                     # EXISTING: No changes needed (Phase 6)
```

### Pattern 1: WHEN-Clause Filtered AFTER UPDATE Trigger
**What:** The `deliveries` table already has 3 triggers. The new alert trigger must fire ONLY when `status` changes to `failed_permanent`. Using a `WHEN` clause in the trigger definition (not inside the function) is the PostgreSQL-recommended approach. It prevents the trigger function from even being called for irrelevant updates.
**When to use:** Any time you need a trigger on a table that already has triggers, and you only care about specific column transitions.
**Example:**
```sql
-- Source: PostgreSQL docs (https://www.postgresql.org/docs/current/sql-createtrigger.html)
-- The WHEN clause is evaluated BEFORE the function executes.
-- OLD.status IS DISTINCT FROM handles NULL safely.
CREATE TRIGGER trg_alert_delivery_failed
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'failed_permanent' AND NEW.status = 'failed_permanent')
  EXECUTE FUNCTION notify_delivery_failed();
```

### Pattern 2: Dedup-First Alert Trigger Function
**What:** Every alert trigger function checks `alert_state` for dedup BEFORE building the pg_net payload. This prevents unnecessary JOINs and pg_net calls for suppressed alerts.
**When to use:** Every alert trigger in the system.
**Example:**
```sql
-- Source: Phase 6 research (alert_state dedup pattern) + existing fire_ghl_delivery pattern
CREATE OR REPLACE FUNCTION notify_delivery_failed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings record;
  v_already_alerted boolean;
  v_dedup_window interval;
  v_lead_name text;
  v_broker_name text;
  v_supabase_url text;
  v_service_key text;
  v_admin_contact text;
BEGIN
  -- 1. Read admin settings (fast, single-row table)
  SELECT * INTO v_settings FROM admin_settings LIMIT 1;
  IF NOT FOUND OR NOT v_settings.alert_sms_enabled OR NOT v_settings.failure_alert_enabled THEN
    RETURN NEW;
  END IF;

  -- 2. Check dedup (broker_id is the context for delivery failures)
  v_dedup_window := (v_settings.dedup_window_minutes || ' minutes')::interval;
  SELECT EXISTS (
    SELECT 1 FROM alert_state
    WHERE alert_type = 'delivery_failed'
      AND context_id = NEW.broker_id::text
      AND last_sent_at > now() - v_dedup_window
  ) INTO v_already_alerted;

  IF v_already_alerted THEN
    UPDATE alert_state
    SET suppressed_count = suppressed_count + 1,
        last_payload = jsonb_build_object('delivery_id', NEW.id, 'channel', NEW.channel, 'error', NEW.error_message)
    WHERE alert_type = 'delivery_failed'
      AND context_id = NEW.broker_id::text;
    RETURN NEW;
  END IF;

  -- 3. JOIN for human-readable names
  SELECT COALESCE(l.first_name || ' ' || l.last_name, l.first_name, l.email, 'Unknown')
  INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;

  SELECT COALESCE(b.first_name || ' ' || b.last_name, b.company, 'Unknown')
  INTO v_broker_name FROM brokers b WHERE b.id = NEW.broker_id;

  -- 4. Read Vault secrets
  SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- 5. Use admin_settings contact ID (faster than Vault read)
  v_admin_contact := v_settings.alert_ghl_contact_id;

  -- 6. Fire pg_net to send-alert edge function
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-alert',
    body := jsonb_build_object(
      'type', 'delivery_failed',
      'admin_contact_id', v_admin_contact,
      'lead_name', v_lead_name,
      'broker_name', v_broker_name,
      'channel', NEW.channel,
      'error', NEW.error_message
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  -- 7. Record alert in dedup table
  INSERT INTO alert_state (alert_type, context_id, last_sent_at, suppressed_count, last_payload)
  VALUES ('delivery_failed', NEW.broker_id::text, now(), 0,
    jsonb_build_object('delivery_id', NEW.id, 'channel', NEW.channel, 'error', NEW.error_message))
  ON CONFLICT (alert_type, context_id)
  DO UPDATE SET last_sent_at = now(), suppressed_count = 0, last_payload = EXCLUDED.last_payload;

  RETURN NEW;
END;
$$;
```

### Pattern 3: Unassigned Lead Alert Trigger
**What:** Fires on `unassigned_queue` INSERT. The context_id for dedup is the lead_id (not broker_id, since unassigned leads have no broker). The `reason` and `details` columns from `unassigned_queue` provide the match failure information.
**When to use:** Only on unassigned_queue INSERT.
**Example:**
```sql
CREATE OR REPLACE FUNCTION notify_unassigned_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings record;
  v_already_alerted boolean;
  v_dedup_window interval;
  v_lead_name text;
  v_supabase_url text;
  v_service_key text;
  v_admin_contact text;
BEGIN
  -- 1. Read admin settings
  SELECT * INTO v_settings FROM admin_settings LIMIT 1;
  IF NOT FOUND OR NOT v_settings.alert_sms_enabled OR NOT v_settings.unassigned_alert_enabled THEN
    RETURN NEW;
  END IF;

  -- 2. Check dedup (lead_id is the context for unassigned alerts)
  v_dedup_window := (v_settings.dedup_window_minutes || ' minutes')::interval;
  SELECT EXISTS (
    SELECT 1 FROM alert_state
    WHERE alert_type = 'unassigned_lead'
      AND context_id = NEW.lead_id::text
      AND last_sent_at > now() - v_dedup_window
  ) INTO v_already_alerted;

  IF v_already_alerted THEN
    UPDATE alert_state
    SET suppressed_count = suppressed_count + 1,
        last_payload = jsonb_build_object('reason', NEW.reason, 'details', NEW.details)
    WHERE alert_type = 'unassigned_lead'
      AND context_id = NEW.lead_id::text;
    RETURN NEW;
  END IF;

  -- 3. JOIN for lead name
  SELECT COALESCE(l.first_name || ' ' || l.last_name, l.first_name, l.email, 'Unknown')
  INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;

  -- 4. Read Vault secrets
  SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  v_admin_contact := v_settings.alert_ghl_contact_id;

  -- 5. Fire pg_net to send-alert edge function
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-alert',
    body := jsonb_build_object(
      'type', 'unassigned_lead',
      'admin_contact_id', v_admin_contact,
      'lead_name', v_lead_name,
      'reason', NEW.reason || ': ' || COALESCE(NEW.details, '')
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  -- 6. Record alert in dedup table
  INSERT INTO alert_state (alert_type, context_id, last_sent_at, suppressed_count, last_payload)
  VALUES ('unassigned_lead', NEW.lead_id::text, now(), 0,
    jsonb_build_object('reason', NEW.reason, 'details', NEW.details))
  ON CONFLICT (alert_type, context_id)
  DO UPDATE SET last_sent_at = now(), suppressed_count = 0, last_payload = EXCLUDED.last_payload;

  RETURN NEW;
END;
$$;
```

### Anti-Patterns to Avoid
- **Trigger without WHEN clause on deliveries:** Without `WHEN (OLD.status IS DISTINCT FROM 'failed_permanent' AND NEW.status = 'failed_permanent')`, the trigger fires on EVERY update to the deliveries table (status changes, retry_count increments, error_message updates, sent_at writes). This is dozens of unnecessary function calls per delivery lifecycle.
- **Dedup check inside the edge function instead of the trigger:** Once `pg_net.http_post` fires, the edge function invocation is already in flight. Checking dedup there wastes an edge function cold start. Do dedup in SQL before the pg_net call.
- **Using BEFORE UPDATE instead of AFTER UPDATE:** The trigger reads from other tables (`leads`, `brokers`, `admin_settings`, `alert_state`, `vault.decrypted_secrets`). A BEFORE trigger runs before the UPDATE is committed, which can cause issues with transaction isolation. AFTER UPDATE is correct.
- **Updating the triggering row from the trigger function:** Never UPDATE the `deliveries` row that fired the trigger from within `notify_delivery_failed()`. This would trigger `deliveries_updated_at` and potentially re-fire the alert trigger (infinite loop). The trigger only reads NEW and writes to `alert_state`.
- **Calling pg_net without checking Vault secrets first:** If `supabase_url` or `service_role_key` is NULL, the `pg_net.http_post` call will fail with a confusing error. Always check and early-return.

## Existing Trigger Map (Critical Reference)

### Triggers on `deliveries` table (as of migration 00011)

| Trigger Name | Event | Timing | Function | Purpose |
|-------------|-------|--------|----------|---------|
| `deliveries_updated_at` | UPDATE | BEFORE | `update_updated_at()` | Auto-set `updated_at` timestamp |
| `trg_fire_outbound_webhook` | INSERT | AFTER | `fire_outbound_webhook()` | Fire pg_net HTTP POST for crm_webhook channel |
| `trg_fire_ghl_delivery` | INSERT | AFTER | `fire_ghl_delivery()` | Fire pg_net to deliver-ghl edge function for email/sms |

**Key insight:** All existing triggers fire on INSERT. The new alert trigger fires on UPDATE (status -> `failed_permanent`). There is ZERO cascade risk because the events are different.

### Triggers on `unassigned_queue` table

| Trigger Name | Event | Timing | Function | Purpose |
|-------------|-------|--------|----------|---------|
| (none) | - | - | - | No triggers exist on this table |

**Key insight:** The `unassigned_queue` table has zero triggers. Adding an AFTER INSERT trigger is completely safe with no cascade risk.

### Triggers on `admin_settings` table

| Trigger Name | Event | Timing | Function | Purpose |
|-------------|-------|--------|----------|---------|
| `admin_settings_updated_at` | UPDATE | BEFORE | `update_updated_at()` | Auto-set `updated_at` timestamp |

### Triggers on `alert_state` table

| Trigger Name | Event | Timing | Function | Purpose |
|-------------|-------|--------|----------|---------|
| (none) | - | - | - | No triggers exist on this table |

## How `failed_permanent` Happens (Execution Flow)

Understanding the exact moment when the alert trigger fires:

1. `pg_cron` runs `process_webhook_retries(10)` every 2 minutes
2. Inside that function, the second loop runs:
   ```sql
   UPDATE deliveries SET status = 'failed_permanent'
   WHERE status = 'failed' AND retry_count >= 3
   RETURNING id, lead_id, broker_id, order_id, channel, error_message, retry_count
   ```
3. This UPDATE fires `deliveries_updated_at` (BEFORE) which sets `updated_at`
4. This UPDATE fires our new `trg_alert_delivery_failed` (AFTER) because `WHEN` clause matches
5. Inside the trigger function, `NEW` has: `id`, `lead_id`, `broker_id`, `order_id`, `channel`, `error_message`, `retry_count`, `status = 'failed_permanent'`
6. The pg_net call is queued (does not execute until transaction commits)
7. After `process_webhook_retries` completes, the transaction commits
8. pg_net sends the HTTP request to the `send-alert` edge function
9. The edge function sends SMS via GHL

**Important:** The pg_net call from step 6 happens within the same transaction as `process_webhook_retries`. Multiple deliveries going `failed_permanent` in the same batch will each queue their own pg_net call. The dedup check in step 4 prevents this: only the FIRST delivery per broker fires the alert, subsequent ones get suppressed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dedup logic | Custom suppression in edge function or application code | `alert_state` table with SQL-level UPSERT (Phase 6) | Dedup must happen BEFORE pg_net fires. Edge function is too late. Application layer doesn't run in trigger context. |
| Name resolution | Passing raw UUIDs in alert SMS | JOINs to `leads` and `brokers` tables inside trigger function | The `send-alert` edge function expects human-readable names. The trigger has direct SQL access to resolve them. |
| Alert config | Hardcoded contact ID or enabled flags | `admin_settings` singleton table (Phase 6) | Changing config shouldn't require a migration. The table is already seeded. |
| Secret management | Passing GHL token through pg_net body | Vault secrets + edge function env vars | GHL token stays in edge function env. Trigger only passes the Supabase service key for auth. |

**Key insight:** Phase 7 adds zero new infrastructure. It only wires existing Phase 6 infrastructure to existing database events. The complexity is in getting the trigger conditions, dedup flow, and JOINs right.

## Common Pitfalls

### Pitfall 1: Trigger Fires During Retry Status Changes (Not Just failed_permanent)
**What goes wrong:** Without a `WHEN` clause, the trigger fires on every UPDATE to the `deliveries` table: `pending->sent`, `sent->failed`, `failed->retrying`, `retrying->failed`, AND `failed->failed_permanent`. Only the last transition should fire an alert.
**Why it happens:** Developer creates `AFTER UPDATE ON deliveries` without filtering.
**How to avoid:** Use `WHEN (OLD.status IS DISTINCT FROM 'failed_permanent' AND NEW.status = 'failed_permanent')` on the trigger definition itself (not inside the function). The `IS DISTINCT FROM` handles the NULL case safely.
**Warning signs:** Multiple alert SMS for the same delivery (one per retry cycle).

### Pitfall 2: Dedup Context_id Mismatch Between Alert Types
**What goes wrong:** Using `broker_id` as context_id for unassigned alerts (or `lead_id` for delivery failure alerts) produces wrong dedup behavior. Two different leads going unassigned would suppress each other if using the same context_id.
**Why it happens:** Copy-pasting the dedup logic between the two trigger functions without changing the context_id.
**How to avoid:** Delivery failures dedup on `broker_id` (same broker endpoint down = correlated failures). Unassigned leads dedup on `lead_id` (each lead is an independent event).
**Warning signs:** Unassigned lead alerts being suppressed when they shouldn't be.

### Pitfall 3: pg_net Queued But Never Fires (Transaction Rollback)
**What goes wrong:** If `process_webhook_retries()` encounters an error AFTER queuing pg_net calls (but before committing), the entire transaction rolls back. The pg_net calls are discarded. No alert is sent, no dedup state is written.
**Why it happens:** pg_net requests are not started until the transaction commits.
**How to avoid:** This is actually correct behavior. If the transaction rolls back, the `failed_permanent` status change also rolls back, so there's nothing to alert about. No action needed. This is a feature, not a bug.
**Warning signs:** None. This is expected behavior.

### Pitfall 4: NULL Lead Name or Broker Name in Alert SMS
**What goes wrong:** The `send-alert` edge function shows "Unknown" for lead or broker name because the JOIN returned NULL.
**Why it happens:** `COALESCE(l.first_name || ' ' || l.last_name, ...)` returns NULL if both first_name and last_name are NULL (string concatenation with NULL = NULL in PostgreSQL).
**How to avoid:** Use `COALESCE(NULLIF(TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')), ''), l.email, l.phone, 'Unknown')` for bulletproof name resolution. Or simpler: `COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')` then TRIM and NULLIF.
**Warning signs:** Alert SMS showing "Unknown" for every lead.

### Pitfall 5: SECURITY DEFINER Function Runs as Wrong User
**What goes wrong:** The trigger function tries to INSERT into `alert_state` but gets a RLS violation because it's running as the wrong role.
**Why it happens:** `SECURITY DEFINER` runs as the function creator (usually `postgres`). But if the function is created by a different role during migration, it might not have the expected permissions.
**How to avoid:** Explicitly set `SET search_path = public` in the function definition. The existing trigger functions (`fire_ghl_delivery`, `fire_outbound_webhook`) don't do this, but they also don't write to RLS-protected tables. For `alert_state` (which has RLS enabled with no write policy for anon), SECURITY DEFINER running as `postgres` is correct because `postgres` bypasses RLS.
**Warning signs:** Error in pg logs about RLS policy violation from trigger function.

## Code Examples

### Complete Delivery Failure Trigger (Ready to Use)
```sql
-- Source: Combines fire_ghl_delivery pattern (migration 00011) + alert_state dedup (migration 00013)

CREATE OR REPLACE FUNCTION notify_delivery_failed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings record;
  v_already_alerted boolean;
  v_dedup_window interval;
  v_lead_name text;
  v_broker_name text;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Read admin settings
  SELECT * INTO v_settings FROM admin_settings LIMIT 1;
  IF NOT FOUND OR NOT v_settings.alert_sms_enabled OR NOT v_settings.failure_alert_enabled THEN
    RETURN NEW;
  END IF;

  -- Check dedup (keyed on broker_id for correlated failure grouping)
  v_dedup_window := (v_settings.dedup_window_minutes || ' minutes')::interval;
  SELECT EXISTS (
    SELECT 1 FROM alert_state
    WHERE alert_type = 'delivery_failed'
      AND context_id = NEW.broker_id::text
      AND last_sent_at > now() - v_dedup_window
  ) INTO v_already_alerted;

  IF v_already_alerted THEN
    UPDATE alert_state
    SET suppressed_count = suppressed_count + 1,
        last_payload = jsonb_build_object(
          'delivery_id', NEW.id, 'channel', NEW.channel,
          'error', NEW.error_message
        )
    WHERE alert_type = 'delivery_failed' AND context_id = NEW.broker_id::text;
    RETURN NEW;
  END IF;

  -- Resolve names via JOIN
  SELECT TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, ''))
  INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;
  v_lead_name := NULLIF(v_lead_name, '');
  IF v_lead_name IS NULL THEN
    SELECT COALESCE(l.email, l.phone, l.id::text) INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;
  END IF;

  SELECT TRIM(COALESCE(b.first_name, '') || ' ' || COALESCE(b.last_name, ''))
  INTO v_broker_name FROM brokers b WHERE b.id = NEW.broker_id;
  v_broker_name := NULLIF(v_broker_name, '');
  IF v_broker_name IS NULL THEN
    SELECT COALESCE(b.company, b.email, b.id::text) INTO v_broker_name FROM brokers b WHERE b.id = NEW.broker_id;
  END IF;

  -- Read Vault secrets
  SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fire pg_net to send-alert
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-alert',
    body := jsonb_build_object(
      'type', 'delivery_failed',
      'admin_contact_id', v_settings.alert_ghl_contact_id,
      'lead_name', v_lead_name,
      'broker_name', v_broker_name,
      'channel', NEW.channel,
      'error', COALESCE(NEW.error_message, 'Unknown error')
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  -- Record in dedup table
  INSERT INTO alert_state (alert_type, context_id, last_sent_at, suppressed_count, last_payload)
  VALUES ('delivery_failed', NEW.broker_id::text, now(), 0,
    jsonb_build_object('delivery_id', NEW.id, 'channel', NEW.channel, 'error', NEW.error_message))
  ON CONFLICT (alert_type, context_id)
  DO UPDATE SET last_sent_at = now(), suppressed_count = 0, last_payload = EXCLUDED.last_payload;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_delivery_failed
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'failed_permanent' AND NEW.status = 'failed_permanent')
  EXECUTE FUNCTION notify_delivery_failed();
```

### Complete Unassigned Lead Trigger (Ready to Use)
```sql
-- Source: Same pattern as notify_delivery_failed, adapted for unassigned_queue INSERT

CREATE OR REPLACE FUNCTION notify_unassigned_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings record;
  v_already_alerted boolean;
  v_dedup_window interval;
  v_lead_name text;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Read admin settings
  SELECT * INTO v_settings FROM admin_settings LIMIT 1;
  IF NOT FOUND OR NOT v_settings.alert_sms_enabled OR NOT v_settings.unassigned_alert_enabled THEN
    RETURN NEW;
  END IF;

  -- Check dedup (keyed on lead_id for unassigned leads)
  v_dedup_window := (v_settings.dedup_window_minutes || ' minutes')::interval;
  SELECT EXISTS (
    SELECT 1 FROM alert_state
    WHERE alert_type = 'unassigned_lead'
      AND context_id = NEW.lead_id::text
      AND last_sent_at > now() - v_dedup_window
  ) INTO v_already_alerted;

  IF v_already_alerted THEN
    UPDATE alert_state
    SET suppressed_count = suppressed_count + 1,
        last_payload = jsonb_build_object('reason', NEW.reason, 'details', NEW.details)
    WHERE alert_type = 'unassigned_lead' AND context_id = NEW.lead_id::text;
    RETURN NEW;
  END IF;

  -- Resolve lead name
  SELECT TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, ''))
  INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;
  v_lead_name := NULLIF(v_lead_name, '');
  IF v_lead_name IS NULL THEN
    SELECT COALESCE(l.email, l.phone, l.id::text) INTO v_lead_name FROM leads l WHERE l.id = NEW.lead_id;
  END IF;

  -- Read Vault secrets
  SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fire pg_net to send-alert
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-alert',
    body := jsonb_build_object(
      'type', 'unassigned_lead',
      'admin_contact_id', v_settings.alert_ghl_contact_id,
      'lead_name', v_lead_name,
      'reason', NEW.reason || COALESCE(': ' || NEW.details, '')
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  -- Record in dedup table
  INSERT INTO alert_state (alert_type, context_id, last_sent_at, suppressed_count, last_payload)
  VALUES ('unassigned_lead', NEW.lead_id::text, now(), 0,
    jsonb_build_object('reason', NEW.reason, 'details', NEW.details))
  ON CONFLICT (alert_type, context_id)
  DO UPDATE SET last_sent_at = now(), suppressed_count = 0, last_payload = EXCLUDED.last_payload;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_unassigned_lead
  AFTER INSERT ON unassigned_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_unassigned_lead();
```

### pg_net.http_post Exact Signature
```sql
-- Source: Supabase pg_net docs (https://supabase.github.io/pg_net/api/)
net.http_post(
  url text,
  body jsonb DEFAULT '{}'::jsonb,
  params jsonb DEFAULT '{}'::jsonb,
  headers jsonb DEFAULT '{"Content-Type": "application/json"}'::jsonb,
  timeout_milliseconds int DEFAULT 2000
) RETURNS bigint
-- Returns a request ID. Request is NOT sent until the transaction commits.
-- Named parameter syntax (url :=, body :=, headers :=) is the convention in this codebase.
```

### Existing pg_net Call Pattern (for reference)
```sql
-- Source: supabase/migrations/00011_unified_deliveries.sql (fire_ghl_delivery function, line 277)
SELECT net.http_post(
  url := v_supabase_url || '/functions/v1/deliver-ghl',
  body := jsonb_build_object(
    'delivery_id', NEW.id,
    'channel', NEW.channel,
    'ghl_contact_id', NEW.ghl_contact_id,
    'payload', NEW.payload
  ),
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_service_key
  )
) INTO v_request_id;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No alerts (check dashboard manually) | DB trigger -> pg_net -> edge function -> GHL SMS | Phase 7 (now) | Admin knows about failures within seconds |
| Alert per event (no dedup) | Dedup via alert_state with 15-min window | Phase 6 foundation | Prevents SMS storms from batch failures |
| Dedup inside application code | Dedup inside SQL trigger (before pg_net fires) | Phase 7 design | Zero wasted edge function invocations |

**Deprecated/outdated:**
- Event type `webhook_failed_permanent` (migration 00010) was renamed to `delivery_failed_permanent` in migration 00011. The alert triggers use `delivery_failed` (not `delivery_failed_permanent`) as the `alert_type` in `alert_state` to keep it shorter and consistent with the `send-alert` edge function's `type` discriminator.

## Open Questions

1. **Should the unassigned lead trigger also include lead vertical, credit score, funding amount?**
   - What we know: The `send-alert` edge function's `formatUnassignedLead` only expects `lead_name` and `reason`. The SMS format is compact.
   - What's unclear: Whether adding more context (vertical, credit score) would help the admin take action faster.
   - Recommendation: Start with just `lead_name` and `reason` (matches the edge function). If the admin wants more detail, add fields to both the trigger payload and the edge function formatter. Keep the first iteration simple.

2. **Should delivery failure alerts include a count of suppressed alerts?**
   - What we know: The `suppressed_count` in `alert_state` tracks how many alerts were suppressed. This count could be included in the NEXT alert for the same broker (e.g., "3 more failures since last alert").
   - What's unclear: Whether reading `suppressed_count` from the previous alert_state row and including it in the new alert adds enough value to justify the extra query.
   - Recommendation: Skip for v1. The 15-minute dedup window means the admin already knows the broker's endpoint is problematic from the first alert. The suppressed count is available in the dashboard (via alert_state table) for later.

3. **Transaction timing: does the unassigned_queue trigger fire inside the assign_lead() transaction?**
   - What we know: `assign_lead()` INSERTs into `unassigned_queue` when no matching order is found. The AFTER INSERT trigger fires at the end of the triggering statement, but pg_net requests don't fire until the TRANSACTION commits. Since `assign_lead()` runs inside a transaction (it uses `pg_advisory_xact_lock`), the pg_net call won't fire until `assign_lead()` completes.
   - What's unclear: Whether there are edge cases where the transaction is very long (slow advisory lock acquisition).
   - Recommendation: No action needed. pg_net's "fire on commit" behavior is correct here. The alert should only fire once the unassigned_queue INSERT is committed.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/00011_unified_deliveries.sql` - All existing triggers on `deliveries` table, `fire_ghl_delivery()` and `fire_outbound_webhook()` patterns, `process_webhook_retries()` `failed_permanent` transition
- `supabase/migrations/00013_alert_dedup.sql` - `alert_state` table schema, dedup pattern for Phase 7 triggers
- `supabase/migrations/00012_admin_settings.sql` - `admin_settings` table schema, singleton constraint, seeded data
- `supabase/functions/send-alert/index.ts` - Expected payload format (`type`, `admin_contact_id`, type-specific fields), SMS formatting
- `supabase/migrations/00003_create_tables.sql` - `unassigned_queue` schema (columns: `lead_id`, `reason`, `details`, `resolved`)
- [PostgreSQL CREATE TRIGGER docs](https://www.postgresql.org/docs/current/sql-createtrigger.html) - WHEN clause syntax, OLD/NEW reference, AFTER vs BEFORE timing
- [Supabase pg_net docs](https://supabase.com/docs/guides/database/extensions/pg_net) - `net.http_post` signature, transaction commit behavior
- [pg_net API reference](https://supabase.github.io/pg_net/api/) - Exact function signature with defaults

### Secondary (MEDIUM confidence)
- `.planning/phases/06-alert-foundation/06-RESEARCH.md` - Phase 6 architecture decisions, dedup pattern, anti-patterns
- `.planning/research/SUMMARY.md` - Overall v1.1 architecture (DB trigger -> pg_net -> edge function -> GHL)

### Tertiary (LOW confidence)
- None. All findings verified against codebase source or official PostgreSQL/Supabase docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Every component already exists in the codebase. Zero new dependencies. The trigger functions are direct clones of `fire_ghl_delivery()` with dedup logic added.
- Architecture: HIGH - All existing triggers mapped. Cascade risks analyzed. The WHEN clause approach is documented in PostgreSQL official docs and verified against the actual status transition in `process_webhook_retries()`.
- Pitfalls: HIGH - Every pitfall is based on actual codebase analysis (existing trigger interactions, NULL handling in lead/broker name resolution, pg_net transaction timing).

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days, stable domain)
