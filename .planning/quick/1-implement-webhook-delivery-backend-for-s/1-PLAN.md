---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/webhooks/deliver.ts
  - src/app/api/leads/incoming/route.ts
  - src/app/api/deliveries/[id]/retry/route.ts
autonomous: true
requirements: [WEBHOOK-DELIVER]

must_haves:
  truths:
    - "When a lead is assigned to a broker with crm_webhook_url, the lead payload is HTTP POSTed to that URL"
    - "Delivery success/failure is recorded in webhook_deliveries with error details"
    - "Failed deliveries can be manually retried via API"
  artifacts:
    - path: "src/lib/webhooks/deliver.ts"
      provides: "deliverWebhook function that sends HTTP POST and updates delivery record"
      exports: ["deliverWebhook"]
    - path: "src/app/api/deliveries/[id]/retry/route.ts"
      provides: "POST endpoint to manually retry a failed webhook delivery"
      exports: ["POST"]
  key_links:
    - from: "src/app/api/leads/incoming/route.ts"
      to: "src/lib/webhooks/deliver.ts"
      via: "fire-and-forget call after assignLead returns delivery_id"
      pattern: "deliverWebhook\\("
    - from: "src/lib/webhooks/deliver.ts"
      to: "webhook_deliveries table"
      via: "supabase update with status, error_message, sent_at"
      pattern: "supabase.*from.*webhook_deliveries"
---

<objective>
Implement Node.js-layer webhook delivery that sends the lead payload HTTP POST to broker CRM URLs after assignment.

Purpose: The assign_lead() RPC already creates webhook_deliveries records with status "pending" and stores the payload snapshot. The pg_net trigger (fire_outbound_webhook) exists in migrations but pg_net reliability in Supabase is inconsistent. This adds a Node.js delivery layer that reads the pending delivery after assignment, sends the HTTP POST, and updates the record. Also adds a manual retry endpoint for failed deliveries.

Output: deliverWebhook() function, updated incoming route with delivery call, manual retry API endpoint.
</objective>

<context>
@src/lib/assignment/assign.ts
@src/app/api/leads/incoming/route.ts
@src/lib/types/database.ts
@supabase/migrations/00009_update_assign_lead.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create deliverWebhook function and wire into lead ingestion</name>
  <files>src/lib/webhooks/deliver.ts, src/app/api/leads/incoming/route.ts</files>
  <action>
Create `src/lib/webhooks/deliver.ts` with a `deliverWebhook(deliveryId: string)` function:

1. Accepts a delivery ID (from assign_lead's return value `delivery_id`)
2. Fetches the webhook_deliveries record by ID using admin supabase client
3. If record not found or status is not 'pending' and not 'failed', return early
4. Sends HTTP POST using native fetch() to `record.target_url` with:
   - Body: JSON.stringify(record.payload)
   - Headers: Content-Type: application/json
   - Signal: AbortSignal.timeout(10000) (10s timeout)
5. On success (2xx response):
   - Update webhook_deliveries SET status = 'sent', sent_at = now(), error_message = null
6. On failure (non-2xx, timeout, network error):
   - Update webhook_deliveries SET status = 'failed', error_message = (the error detail), last_retry_at = now()
   - Increment retry_count
7. Function should never throw. Wrap everything in try/catch. Log errors to console.error but return gracefully.
8. Return { success: boolean, error?: string }

Then update `src/app/api/leads/incoming/route.ts`:
- Import deliverWebhook from '@/lib/webhooks/deliver'
- After the assignLead() call, check if `assignment.status === 'assigned'` and `assignment.delivery_id` is truthy
- If so, call `deliverWebhook(assignment.delivery_id)` with `.catch(console.error)` (fire-and-forget, do NOT await it or block the response)
- The 200 response to the webhook sender should NOT wait for delivery

Note: The pg_net trigger (fire_outbound_webhook) also fires on INSERT, so both mechanisms may fire. That's fine. The Node.js delivery will check status before sending. If pg_net already sent it (status = 'sent'), the Node.js function will skip it. If pg_net is not enabled, the Node.js function handles delivery.
  </action>
  <verify>
    bun run build 2>&1 | tail -5
  </verify>
  <done>deliverWebhook function exists and is called fire-and-forget from incoming lead route. Build passes with no type errors.</done>
</task>

<task type="auto">
  <name>Task 2: Create manual retry API endpoint for failed deliveries</name>
  <files>src/app/api/deliveries/[id]/retry/route.ts</files>
  <action>
Create `src/app/api/deliveries/[id]/retry/route.ts` with a POST handler:

1. Extract delivery ID from route params
2. Validate it's a valid UUID format (simple regex check, return 400 if not)
3. Fetch the webhook_deliveries record by ID
4. If not found, return 404 { error: 'delivery_not_found' }
5. If status is not 'failed' and not 'failed_permanent', return 400 { error: 'delivery_not_retryable', status: record.status }
6. If status is 'failed_permanent', reset retry_count to 0 before retrying (allow manual override of permanent failures)
7. Call deliverWebhook(id) and AWAIT the result (unlike fire-and-forget in ingestion, manual retry should return the outcome)
8. Return 200 { delivery_id: id, result } on success attempt
9. Return 500 { error: 'retry_failed', message: result.error } if delivery itself errored

Use createAdminClient for Supabase access. No auth middleware needed yet (admin-only endpoint, will be protected by dashboard auth later).
  </action>
  <verify>
    bun run build 2>&1 | tail -5
  </verify>
  <done>POST /api/deliveries/[id]/retry endpoint exists, validates input, calls deliverWebhook, returns result. Build passes.</done>
</task>

</tasks>

<verification>
- `bun run build` completes without errors
- `src/lib/webhooks/deliver.ts` exports deliverWebhook function
- `src/app/api/leads/incoming/route.ts` calls deliverWebhook after assignment
- `src/app/api/deliveries/[id]/retry/route.ts` handles POST requests
</verification>

<success_criteria>
- Lead assignment with a broker crm_webhook_url triggers Node.js HTTP POST delivery
- Delivery result (success/failure) is recorded in webhook_deliveries table
- Failed deliveries can be manually retried via POST /api/deliveries/[id]/retry
- Build passes, no type errors
</success_criteria>

<output>
After completion, create `.planning/quick/1-implement-webhook-delivery-backend-for-s/1-SUMMARY.md`
</output>
