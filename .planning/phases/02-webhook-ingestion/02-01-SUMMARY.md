---
phase: 02-webhook-ingestion
plan: 01
subsystem: api
tags: [zod, next-api-routes, webhooks, ghl, idempotency, validation]

# Dependency graph
requires:
  - phase: 01-foundation-assignment-engine
    provides: assign_lead() RPC function, createAdminClient(), database schema with leads table
provides:
  - POST /api/leads/incoming webhook endpoint
  - Zod validation schema for GHL lead payloads (incomingLeadSchema)
  - Test script covering 6 webhook scenarios
affects: [02-webhook-ingestion, 03-delivery]

# Tech tracking
tech-stack:
  added: []
  patterns: [Zod safeParse for API validation, SELECT-first idempotency pattern, graceful assignment error handling]

key-files:
  created:
    - src/lib/webhooks/schemas.ts
    - src/app/api/leads/incoming/route.ts
    - scripts/test-webhook-post.ts
  modified: []

key-decisions:
  - "SELECT-first idempotency over upsert: simpler, avoids re-assignment on duplicate"
  - "Graceful assignment errors: catch assignLead failures and return 200 with error status so lead is never lost"
  - "Empty string handling: email/phone allow empty string via z.literal('') to handle GHL inconsistency"

patterns-established:
  - "Webhook validation: Zod safeParse -> 400 with flatten() on failure"
  - "Idempotency: SELECT by unique key before INSERT, return existing ID on duplicate"
  - "Error isolation: assignment failures don't block lead storage"

requirements-completed: [HOOK-01, HOOK-02, HOOK-03, HOOK-05]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 2 Plan 1: Webhook Ingestion Endpoint Summary

**POST /api/leads/incoming with Zod validation, ghl_contact_id idempotency, and assignLead() trigger**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T13:06:20Z
- **Completed:** 2026-03-12T13:09:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- POST /api/leads/incoming validates GHL payloads with Zod, stores leads, and triggers assignment engine
- Idempotency on ghl_contact_id prevents duplicate leads (returns 200 with existing ID)
- Test script covers 6 scenarios: valid, duplicate, missing required, invalid JSON, minimal, coerced types

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zod validation schema and POST route handler with idempotency** - `6f62ae0` (feat)
2. **Task 2: Create test script validating all POST webhook scenarios** - `88c7176` (test)

## Files Created/Modified
- `src/lib/webhooks/schemas.ts` - Zod schema for GHL lead payload (incomingLeadSchema + IncomingLeadPayload type)
- `src/app/api/leads/incoming/route.ts` - POST handler with JSON parsing, Zod validation, idempotency check, insert, assignLead call
- `scripts/test-webhook-post.ts` - 6-scenario test script with auto-cleanup

## Decisions Made
- **SELECT-first idempotency over upsert:** Simpler pattern. Check ghl_contact_id exists, return existing ID if found. Avoids re-triggering assignment on duplicates.
- **Graceful assignment error handling:** assignLead() failures are caught and returned in the response body with status: 'error'. The lead is still stored. This ensures no leads are lost even if the assignment engine has issues.
- **Empty string handling for email/phone:** GHL sometimes sends empty strings instead of omitting fields. Schema uses `.or(z.literal(''))` to accept empty strings, then converts to null before DB insert.
- **Json type cast for raw_payload:** Cast body as Json (from database types) to satisfy Supabase's type-safe insert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed raw_payload type mismatch**
- **Found during:** Task 1 (route handler)
- **Issue:** `body as Record<string, unknown>` didn't match Supabase's `Json` type, causing TS2769
- **Fix:** Imported `Json` type from database types, cast as `Json` instead
- **Files modified:** src/app/api/leads/incoming/route.ts
- **Verification:** `tsc --noEmit --skipLibCheck` passes clean
- **Committed in:** 6f62ae0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial type fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Webhook endpoint ready for GHL integration
- Test script ready to run against dev server
- Next: 02-02 will add webhook security and real GHL payload testing

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 02-webhook-ingestion*
*Completed: 2026-03-12*
