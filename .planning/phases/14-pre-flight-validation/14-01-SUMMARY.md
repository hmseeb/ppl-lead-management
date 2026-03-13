---
phase: 14-pre-flight-validation
plan: 01
type: summary
status: complete
started: 2026-03-13
completed: 2026-03-13
---

## What was done

### Task 1: DB migration
- Created `00020_preflight_validation.sql`: added 'rejected' to leads status CHECK, `rejection_reason` text column, email+phone dedup unique partial index, rejected leads index
- Applied migration, regenerated TypeScript types

### Task 2: Pre-flight validation in webhook route
- Added email+phone dedup check after ghl_contact_id idempotency (VALID-04)
- Added pre-flight validation: credit < 600 (VALID-01), missing/invalid funding_amount (VALID-02), no active orders (VALID-03)
- Rejected leads stored with status='rejected' + rejection_reason
- Activity log entries with event_type='lead_rejected'
- All rejections return HTTP 200 with reason

## Artifacts
- `supabase/migrations/00020_preflight_validation.sql`
- `src/lib/types/database.ts` — regenerated with rejection_reason
- `src/app/api/leads/incoming/route.ts` — 4 validation checks
