---
phase: 34
status: passed
verified: 2026-03-25
must_haves_verified: 5/5
requirements_verified: [CALL-01, CALL-02, CALL-05, CALL-06, CALL-07, AVAIL-01]
---

# Phase 34: Callback API + Broker Availability - Verification

## Goal
Retell can book and cancel callbacks for unavailable brokers, with immediate webhook notification to the broker's CRM.

## Must-Haves Verification

### 1. POST /api/callbacks creates callback and returns 201
**Status: PASSED**
- `src/app/api/callbacks/route.ts` exports POST handler
- Zod validates lead_id (uuid), broker_id (uuid), scheduled_time (ISO datetime, future-only), notes (optional)
- Inserts into callbacks table with status 'pending'
- Returns `NextResponse.json(callback, { status: 201 })`
- Verifies lead exists (404 if not), broker exists (404 if not)

### 2. Creating a callback fires callback_created webhook
**Status: PASSED**
- POST handler calls `fireCallbackWebhook({ type: 'callback_created', ... })` with `.catch(console.error)` (fire-and-forget)
- Webhook payload includes: type discriminator, full callback object, full lead details (id, first_name, last_name, email, phone, vertical, credit_score, funding_amount, state), full broker details (id, name, email, phone, company)
- POSTs to `broker.crm_webhook_url` with 10s AbortController timeout
- Skips silently if crm_webhook_url is null/empty

### 3. DELETE /api/callbacks/[id] cancels callback and fires webhook
**Status: PASSED**
- `src/app/api/callbacks/[id]/route.ts` exports DELETE handler
- Returns 404 if callback not found
- Returns 409 if already cancelled or completed (`callback_already_{status}`)
- Updates status to 'cancelled', fires `fireCallbackWebhook({ type: 'callback_cancelled', ... })`
- Returns 200 with updated callback record

### 4. GET /api/leads/lookup includes broker availability
**Status: PASSED**
- Broker select query includes `contact_hours, timezone, weekend_pause`
- Response includes `broker.availability` object with all three fields
- Unassigned leads return `broker: null` (unchanged)
- No breaking changes to existing response shape

### 5. All callback webhooks include type + full lead/broker details
**Status: PASSED**
- `fireCallbackWebhook` in `src/lib/webhooks/callback-webhook.ts` constructs payload with:
  - `type`: 'callback_created' | 'callback_cancelled'
  - `callback`: { id, scheduled_time, status, notes, created_at }
  - `lead`: { id, first_name, last_name, email, phone, vertical, credit_score, funding_amount, state }
  - `broker`: { id, name, email, phone, company }
- Both POST (booking) and DELETE (cancellation) routes pass full payloads

## Requirements Cross-Reference

| Requirement | Plan | Verified |
|-------------|------|----------|
| CALL-01 | 34-01 | Yes - POST /api/callbacks creates callback |
| CALL-02 | 34-01 | Yes - callback_created webhook fires on booking |
| CALL-05 | 34-01 | Yes - DELETE /api/callbacks/[id] cancels callback |
| CALL-06 | 34-01 | Yes - callback_cancelled webhook fires on cancellation |
| CALL-07 | 34-01 | Yes - All webhooks include type + full payload |
| AVAIL-01 | 34-02 | Yes - Lookup returns contact_hours, timezone, weekend_pause |

## Automated Checks

- TypeScript compilation: PASSED (zero errors excluding pre-existing bun:test module errors)
- All key files exist on disk: PASSED
- Git commits present: 5 commits (2 feat + 2 docs + 1 feat)
- Database types updated: PASSED (callbacks table in database.ts)
- Migration file present: PASSED (00030_callbacks.sql)

## Summary

All 5 must-haves verified. All 6 requirement IDs accounted for. Phase 34 goal achieved.
