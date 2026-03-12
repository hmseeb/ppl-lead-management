---
phase: 03-lead-delivery
plan: 02
subsystem: database
tags: [pg_cron, pg_net, webhook, retry, exponential-backoff, postgres]

# Dependency graph
requires:
  - phase: 03-lead-delivery
    provides: "webhook_deliveries table, fire_outbound_webhook() trigger, assign_lead() with delivery wiring"
provides:
  - "check_delivery_responses() function that reads pg_net HTTP responses and marks failures"
  - "process_webhook_retries() function with exponential backoff, batch limiting, and permanent failure logging"
  - "Two pg_cron schedules: 30s response checker, 2min retry scanner"
  - "End-to-end delivery pipeline test script"
affects: [04-dashboard, 05-realtime]

# Tech tracking
tech-stack:
  added: [pg_cron]
  patterns: [pg_cron-response-checker, exponential-backoff-retry, batch-limited-retry-scanner]

key-files:
  created:
    - supabase/migrations/00010_retry_failed_webhooks.sql
    - scripts/test-webhook-delivery.ts

key-decisions:
  - "Payload snapshot used for retries (stored jsonb from assign_lead), not re-fetched from leads table"
  - "Permanent failures logged to activity_log with event_type webhook_failed_permanent for dashboard visibility"
  - "pg_net _http_response rows cleaned up after processing to prevent table bloat"

patterns-established:
  - "pg_cron response checker pattern: poll _http_response, update delivery status, clean up processed rows"
  - "Batch-limited retry with exponential backoff: LIMIT p_batch_size, interval * power(2, retry_count)"
  - "UPDATE ... RETURNING with FOR loop for atomic mark-and-log of permanent failures"

requirements-completed: [DLVR-02, DLVR-03]

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 3 Plan 2: Retry Pipeline Summary

**pg_cron retry pipeline with 30s response checker, 2min batch-limited retry scanner, exponential backoff, and permanent failure logging to activity_log**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-12T13:33:00Z
- **Completed:** 2026-03-12T13:40:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- check_delivery_responses() reads pg_net HTTP responses every 30s and marks deliveries as failed on timeout, 4xx/5xx, or connection error
- process_webhook_retries() retries up to 3 times with exponential backoff (1min, 2min, 4min) and batch limit of 10
- Permanent failures (3 strikes) marked as failed_permanent with activity_log entry for admin dashboard
- End-to-end test script with 31 assertions covering delivery creation, payload validation, no-URL skip, status tracking, and retry function execution

## Task Commits

Each task was committed atomically:

1. **Task 1: Create response checker, retry scanner, and pg_cron schedules** - `fa6f8a3` (feat)
2. **Task 2: Create end-to-end delivery pipeline test script** - `6282bf9` (feat)

## Files Created/Modified
- `supabase/migrations/00010_retry_failed_webhooks.sql` - check_delivery_responses() + process_webhook_retries() + two pg_cron schedules
- `scripts/test-webhook-delivery.ts` - 5 test scenarios, 31 assertions validating the full delivery pipeline

## Decisions Made
- Used the stored payload jsonb snapshot for retries instead of re-fetching from leads table. This ensures the broker receives the exact same data that was originally intended, even if the lead record has been updated since assignment.
- Permanent failures are logged to activity_log (not just status-flagged) so they appear in the admin dashboard activity feed alongside other events.
- pg_net _http_response rows are deleted after processing to prevent unbounded table growth, following pg_net documentation recommendations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Test broker creation required populating many NOT NULL columns from the pre-existing ppl-onboarding schema (batch_size, deal_amount, delivery_methods, etc.). Resolved by creating a baseBroker template object with all required fields.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (Lead Delivery) is fully complete: webhook delivery table, pg_net trigger, retry pipeline, and test suite
- Delivery status lifecycle fully operational: pending -> sent -> (failed -> retrying -> sent | failed_permanent)
- Dashboard (Phase 4) can now display delivery statuses, retry counts, and permanent failure alerts
- activity_log has webhook_failed_permanent events ready for the activity feed

## Self-Check: PASSED

All files verified present. Both task commits (fa6f8a3, 6282bf9) verified in git log.

---
*Phase: 03-lead-delivery*
*Completed: 2026-03-12*
