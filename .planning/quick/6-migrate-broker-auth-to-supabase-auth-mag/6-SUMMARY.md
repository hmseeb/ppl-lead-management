---
phase: quick-6
plan: 1
subsystem: auth
tags: [supabase-auth, otp, magic-link, iron-session, broker-portal]

# Dependency graph
requires:
  - phase: none
    provides: existing broker portal auth via magic_links table
provides:
  - Supabase Auth OTP-based magic link flow for broker portal
  - Auth callback page with code exchange and iron-session creation
  - Deprecated old verify route with graceful redirect
affects: [broker-portal, magic-links]

# Tech tracking
tech-stack:
  added: []
  patterns: [supabase-auth-otp-flow, code-exchange-callback-pattern]

key-files:
  created:
    - src/app/portal/auth/callback/page.tsx
    - src/app/portal/auth/callback/actions.ts
  modified:
    - src/lib/actions/magic-link.ts
    - src/app/portal/auth/verify/route.ts

key-decisions:
  - "Use signInWithOtp with shouldCreateUser:true to auto-provision Supabase Auth users for brokers"
  - "Callback page is client component using useSearchParams for code extraction"

patterns-established:
  - "Supabase Auth OTP flow: server sends via signInWithOtp, client exchanges code, server action creates iron-session"

requirements-completed: [AUTH-MIGRATE-01]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Quick Task 6: Migrate Broker Auth to Supabase Auth Magic Links Summary

**Replaced custom magic_links table + GHL edge function with Supabase Auth signInWithOtp flow, preserving iron-session for portal access**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T16:31:21Z
- **Completed:** 2026-03-26T16:33:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Rewrote sendMagicLink to use Supabase Auth signInWithOtp instead of custom magic_links table + edge function
- Created /portal/auth/callback page that exchanges auth code and creates iron-session
- Deprecated old /portal/auth/verify route with graceful redirect for stale emails
- Removed all references to supabase.functions.invoke('send-magic-link') and magic_links table

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite magic-link actions to use Supabase Auth OTP** - `8a53a5e` (feat)
2. **Task 2: Create auth callback page and deprecate old verify route** - `59cc5de` (feat)

## Files Created/Modified
- `src/lib/actions/magic-link.ts` - sendMagicLink now uses signInWithOtp, verifyMagicLink deprecated
- `src/app/portal/auth/callback/page.tsx` - Client component: exchanges auth code, calls server action, redirects to portal
- `src/app/portal/auth/callback/actions.ts` - Server action: looks up broker by email, creates iron-session
- `src/app/portal/auth/verify/route.ts` - Deprecated: redirects to login with error for old magic link tokens

## Decisions Made
- Used `shouldCreateUser: true` so Supabase Auth auto-provisions auth users for brokers on first magic link send
- Callback page wrapped in Suspense with useSearchParams (required by Next.js for client-side search param access)
- Kept verifyMagicLink function as deprecated stub rather than deleting it (old verify route still imports it briefly)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Supabase Auth SMTP should already be configured in the Supabase dashboard.

## Next Steps
- Verify end-to-end flow in staging (manual test)
- Consider removing the magic_links table from the database after confirming all old tokens have expired
- Clean up the deprecated verifyMagicLink function and old verify route in a future cleanup pass

## Self-Check: PASSED

All 4 source files verified on disk. Both task commits (8a53a5e, 59cc5de) found in git log.

---
*Quick Task: 6-migrate-broker-auth-to-supabase-auth-mag*
*Completed: 2026-03-26*
