---
phase: 09-daily-digest
plan: "01"
subsystem: infra
tags: [pg_cron, pg_net, edge-function, ghl, email, sms, html-email, digest]

requires:
  - phase: 06-alert-foundation
    provides: admin_settings table with alert_ghl_contact_id, Vault secrets for supabase_url and service_role_key
  - phase: 03-lead-delivery
    provides: deliver-ghl edge function pattern for GHL email (html field) and SMS (message field)
provides:
  - digest_runs tracking table for audit trail and period boundary management
  - send-digest edge function querying overnight stats and sending HTML email + SMS via GHL
  - pg_cron daily schedule at 0 16 * * * UTC (8 AM PST) calling send-digest via pg_net
  - idx_deliveries_created_at index improving time-bounded delivery queries
affects: []

tech-stack:
  added: []
  patterns:
    - "pg_cron scheduled edge function invocation via pg_net with Vault auth"
    - "Edge function self-querying Supabase with 12 parallel count queries"
    - "HTML email template with inline styles and table-based layout"

key-files:
  created:
    - supabase/migrations/00015_daily_digest.sql
    - supabase/functions/send-digest/index.ts
  modified: []

key-decisions:
  - "Edge function queries stats itself rather than receiving pre-computed payload from SQL. Simpler and fast enough at current data volume."
  - "Always send digest even on zero-activity days. Confirms system is running."
  - "Record partial failures (email ok, SMS failed or vice versa) as status 'sent' with partial_failure flag in stats jsonb."

patterns-established:
  - "Digest tracking table pattern: period_start/period_end boundaries prevent double-counting across runs"
  - "Native Date + Intl.DateTimeFormat for date formatting in edge functions (no date-fns dependency)"

requirements-completed: [DGST-01, DGST-02, DGST-03, DGST-04]

duration: 2min
completed: 2026-03-13
---

# Phase 9 Plan 01: Daily Digest Summary

**pg_cron scheduled edge function that queries overnight stats, builds inline-styled HTML email + compact SMS, and sends both to admin via GHL Conversations API with digest_runs audit trail**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T02:36:23Z
- **Completed:** 2026-03-13T02:38:37Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Migration with digest_runs table, idx_deliveries_created_at index, and pg_cron schedule at 0 16 * * * UTC
- send-digest edge function with 12 parallel stats count queries, HTML email builder, compact SMS builder
- Full GHL integration using html field for email and message field for SMS (avoiding the known blank-email bug)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create digest_runs table, deliveries index, and pg_cron schedule migration** - `663a5d6` (feat)
2. **Task 2: Create send-digest edge function with stats queries, HTML email, and SMS** - `b8c5c81` (feat)

## Files Created/Modified
- `supabase/migrations/00015_daily_digest.sql` - digest_runs table, deliveries created_at index, pg_cron schedule
- `supabase/functions/send-digest/index.ts` - Edge function: stats queries, HTML email, SMS, digest_runs recording

## Decisions Made
- Edge function queries stats itself (no pre-computed SQL payload). Simpler architecture, fast enough at current volume.
- Always send digest on zero-activity days. "0 leads, 0 deliveries" confirms the system is running.
- Partial failures (email ok but SMS fails) recorded as 'sent' with partial_failure flag in stats jsonb.
- Used native Intl.DateTimeFormat for date formatting instead of importing date-fns (keeps edge function lightweight).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - all Vault secrets (supabase_url, service_role_key) and env vars (GHL_API_TOKEN, GHL_FROM_EMAIL) were configured in earlier phases.

## Next Phase Readiness
- Phase 9 is the final phase. Daily digest completes the v1.1 Monitoring & Alerting milestone.
- All v1.1 features now operational: delivery stats dashboard, real-time alerts, and daily digest.

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 09-daily-digest*
*Completed: 2026-03-13*
