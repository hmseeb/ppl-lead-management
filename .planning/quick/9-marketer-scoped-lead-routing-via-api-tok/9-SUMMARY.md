---
phase: quick-9
plan: 1
subsystem: api
tags: [api-tokens, lead-routing, marketers, bearer-auth]

requires:
  - phase: quick-7
    provides: Marketer role system with auth + admin management
provides:
  - Marketer-scoped lead routing via Bearer API tokens
  - Token column on marketers table with mkt_ prefix
  - marketer_id FK on leads for source tracking
  - Admin token visibility in marketers table
  - Marketer token display on dashboard overview
affects: [lead-routing, api-incoming, marketers]

tech-stack:
  added: []
  patterns: [bearer-token-scoped-routing, optional-param-backward-compat]

key-files:
  created:
    - supabase/migrations/20260327_marketer_tokens_and_lead_source.sql
    - src/components/marketers/marketer-token-display.tsx
  modified:
    - src/lib/types/database.ts
    - src/lib/actions/marketers.ts
    - src/lib/queries/marketers.ts
    - src/lib/assignment/assign.ts
    - src/app/api/leads/incoming/route.ts
    - src/components/marketers/marketers-table.tsx
    - src/app/(dashboard)/page.tsx

key-decisions:
  - "Bearer token auth on /api/leads/incoming is additive, no-token requests flow unchanged"
  - "assignLead brokerIds param is optional for full backward compatibility"
  - "Marketer tokens auto-generated with mkt_ prefix via DB default + JS generation on create"

patterns-established:
  - "Bearer token scoping: API routes check optional auth header, scope downstream queries when present"
  - "Optional param backward compat: assignLead(leadId, brokerIds?) filters only when brokerIds provided"

requirements-completed: [MKTLEAD-01, MKTLEAD-02, MKTLEAD-03, MKTLEAD-04, MKTLEAD-05]

duration: 4min
completed: 2026-03-27
---

# Quick Task 9: Marketer-Scoped Lead Routing via API Tokens Summary

**Bearer token auth on /api/leads/incoming with marketer-scoped broker routing, token column on marketers, and token display in admin table + marketer dashboard**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T12:15:29Z
- **Completed:** 2026-03-27T12:20:02Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Leads posted with a marketer Bearer token route only to that marketer's assigned brokers
- Leads posted without a token continue through existing global routing unchanged
- Admin can see and copy marketer tokens in the marketers table
- Marketer can see and copy their own API token on the dashboard overview
- Invalid/inactive tokens return proper 401/403 error codes
- Marketers with no brokers assigned get a clear 400 error

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration + types + backend logic** - `85b434f` (feat)
2. **Task 2: Admin token column + marketer dashboard token display** - `81d2eaf` (feat)

## Files Created/Modified
- `supabase/migrations/20260327_marketer_tokens_and_lead_source.sql` - Token column on marketers, marketer_id FK on leads
- `src/lib/types/database.ts` - Added token to marketers types, marketer_id to leads types with FK relationship
- `src/lib/actions/marketers.ts` - createMarketer generates mkt_ token in JS before insert
- `src/lib/queries/marketers.ts` - fetchMarketers includes token in select, new fetchMarketerToken query
- `src/lib/assignment/assign.ts` - assignLead accepts optional brokerIds to scope candidate orders
- `src/app/api/leads/incoming/route.ts` - Bearer token lookup, marketer validation, scoped routing, marketer_id on insert
- `src/components/marketers/marketers-table.tsx` - API Token column with truncated display + copy button
- `src/components/marketers/marketer-token-display.tsx` - Full token display with copy toggle for marketer dashboard
- `src/app/(dashboard)/page.tsx` - Shows MarketerTokenDisplay when logged in as marketer

## Decisions Made
- Bearer token auth is additive: no-token requests flow through completely unchanged (zero regression risk)
- assignLead's brokerIds param is optional, making the change fully backward-compatible
- Token generated both in JS (createMarketer) and via DB default (backfills existing rows)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Run the migration to add the token column and marketer_id FK.

## Next Phase Readiness
- Marketer-scoped lead routing is complete and ready for production
- Future consideration: rate limiting on per-token basis

## Self-Check: PASSED

All 9 files verified present. Both task commits (85b434f, 81d2eaf) verified in git log.

---
*Quick Task: 9-marketer-scoped-lead-routing-via-api-tok*
*Completed: 2026-03-27*
