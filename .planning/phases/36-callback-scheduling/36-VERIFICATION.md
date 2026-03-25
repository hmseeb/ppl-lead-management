---
phase: 36
status: passed
verifier: orchestrator
verified_at: 2026-03-25
updated: 2026-03-25
---

# Phase 36: Callback Scheduling - Verification

## Phase Goal
Brokers receive automated reminder and due-time webhook notifications for upcoming callbacks without any manual intervention.

## Requirements Verification

### CALL-03: pg_cron fires callback_reminder webhook 15 minutes before scheduled time
**Status: PASS**
- Migration `00032_callback_scheduling.sql` creates pg_cron job `fire-callback-webhooks` running every 5 minutes
- Edge function queries pending callbacks with `scheduled_time > now()` AND `scheduled_time <= now() + 20 minutes` AND `reminder_sent_at IS NULL`
- 20-minute window with 5-minute cron cycle ensures ~15 minute advance notice
- Fires webhook with `type: "callback_reminder"` to `broker.crm_webhook_url`
- Sets `reminder_sent_at` after firing to prevent duplicates

### CALL-04: pg_cron fires callback_due webhook at the scheduled callback time
**Status: PASS**
- Same pg_cron job fires every 5 minutes
- Edge function queries pending callbacks with `scheduled_time <= now()`
- Fires webhook with `type: "callback_due"` to `broker.crm_webhook_url`
- Marks callback status as `completed` after firing

## Success Criteria Verification

### 1. callback_reminder webhook fires ~15 min before scheduled time
**PASS** - Edge function line 155-178: queries `status = 'pending'`, `scheduled_time > now()`, `scheduled_time <= now+20min`, `reminder_sent_at IS NULL`. pg_cron runs every 5 min, so reminders fire within 10-20 min window before scheduled time.

### 2. callback_due webhook fires at scheduled time
**PASS** - Edge function line 107-153: queries `status = 'pending'`, `scheduled_time <= now()`. Fires webhook and updates status to `completed`.

### 3. Only pending callbacks receive webhooks
**PASS** - Both queries filter `.eq('status', 'pending')`. Cancelled and completed callbacks are excluded.

### 4. Webhooks use same payload format as callback_created
**PASS** - `buildPayload()` function (lines 31-65) produces `{ type, callback: {id, scheduled_time, status, notes, created_at}, lead: {id, first_name, last_name, email, phone, vertical, credit_score, funding_amount, state}, broker: {id, name, email, phone, company} }`. This matches the `CallbackWebhookParams` interface in `src/lib/webhooks/callback-webhook.ts` exactly. Broker name is joined from first_name + last_name, company mapped from company_name, matching the existing `fireCallbackWebhook` utility.

## Must-Have Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/functions/fire-callback-webhooks/index.ts` | EXISTS (219 lines) | Edge function with auth, queries, webhook dispatch |
| `supabase/migrations/00032_callback_scheduling.sql` | EXISTS (42 lines) | ALTER TABLE + cron.schedule with vault secrets |

## Key Links Verified

| From | To | Via | Status |
|------|----|-----|--------|
| Migration | Edge function | `pg_cron -> net.http_post -> /functions/v1/fire-callback-webhooks` | PASS |
| Edge function | Callbacks table | `from('callbacks').eq('status', 'pending')` | PASS |
| Edge function | Broker CRM | `fetch(broker.crm_webhook_url)` with callback payload | PASS |

## Gaps
None.

## Score
4/4 success criteria verified. 2/2 requirements accounted for.
