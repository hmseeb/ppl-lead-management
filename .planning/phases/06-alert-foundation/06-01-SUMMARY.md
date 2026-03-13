---
phase: 06-alert-foundation
plan: "01"
subsystem: database, api
tags: [supabase, vault, ghl, sms, edge-function, deno, alerts]

# Dependency graph
requires:
  - phase: 03-lead-delivery
    provides: GHL Conversations API pattern from deliver-ghl edge function
  - phase: 01-foundation
    provides: update_updated_at() trigger function from migration 00003
provides:
  - admin_settings singleton table with alert preferences
  - Vault secret for admin GHL contact ID
  - send-alert edge function with delivery_failed and unassigned_lead SMS formatters
affects: [06-alert-foundation, 07-alert-triggers]

# Tech tracking
tech-stack:
  added: []
  patterns: [singleton table with unique index on (true), type-discriminated edge function]

key-files:
  created:
    - supabase/migrations/00012_admin_settings.sql
    - supabase/functions/send-alert/index.ts
  modified: []

key-decisions:
  - "Singleton enforced via unique index on (true) rather than CHECK constraint or application logic"
  - "send-alert is stateless (no DB reads/writes) to keep it simple and fast"
  - "Generic fallback formatter for unknown alert types ensures forward compatibility"

patterns-established:
  - "Singleton config table: unique index on ((true)) for single-row tables"
  - "Alert edge function: type discriminator pattern with per-type formatters"

requirements-completed: [ALRT-01, ALRT-05]

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 6 Plan 01: Alert Foundation Summary

**Singleton admin_settings table with Vault-stored contact ID and stateless send-alert edge function delivering type-discriminated SMS via GHL**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T01:46:34Z
- **Completed:** 2026-03-13T01:48:37Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- admin_settings singleton table with alert preferences (dedup window, per-type toggles)
- Admin GHL contact ID seeded in both table row and Supabase Vault
- send-alert edge function handling delivery_failed and unassigned_lead with distinct SMS formats
- 429 rate-limit handling separated from permanent errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin_settings table and Vault secret migration** - `bc77180` (feat)
2. **Task 2: Create send-alert edge function with type discriminator** - `6969973` (feat)

## Files Created/Modified
- `supabase/migrations/00012_admin_settings.sql` - Admin settings table, singleton constraint, seed data, Vault secret, RLS
- `supabase/functions/send-alert/index.ts` - Stateless edge function sending typed SMS alerts via GHL Conversations API

## Decisions Made
- Singleton enforced via `CREATE UNIQUE INDEX admin_settings_singleton ON admin_settings ((true))` rather than CHECK constraint or application logic. Simpler and database-native.
- send-alert is completely stateless (no supabase-js, no DB reads/writes). Keeps it fast and simple since the caller provides all needed data.
- Added generic fallback formatter for unknown alert types so future alert types work without code changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- admin_settings table ready for Phase 6 Plan 02 (alert triggers) to query
- send-alert edge function ready to be called by DB triggers via pg_net
- Vault secret `admin_ghl_contact_id` available for trigger functions to read

## Self-Check: PASSED

All files and commits verified:
- FOUND: supabase/migrations/00012_admin_settings.sql
- FOUND: supabase/functions/send-alert/index.ts
- FOUND: bc77180 (Task 1)
- FOUND: 6969973 (Task 2)

---
*Phase: 06-alert-foundation*
*Completed: 2026-03-13*
