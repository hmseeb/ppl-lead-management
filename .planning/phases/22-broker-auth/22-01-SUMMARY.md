---
phase: 22-broker-auth
plan: 01
subsystem: auth
tags: [magic-link, iron-session, supabase, ghl, edge-function]

requires:
  - phase: none
    provides: existing brokers table, admin supabase client, iron-session pattern
provides:
  - magic_links database migration
  - broker-session module (separate cookie from admin)
  - sendMagicLink/verifyMagicLink server actions
  - send-magic-link edge function (GHL email)
  - /portal/auth/verify token verification route
affects: [22-broker-auth, broker-portal]

tech-stack:
  added: []
  patterns: [broker-session-cookie, magic-link-flow, ghl-email-for-auth]

key-files:
  created:
    - supabase/migrations/00026_magic_links.sql
    - src/lib/auth/broker-session.ts
    - src/lib/actions/magic-link.ts
    - supabase/functions/send-magic-link/index.ts
    - src/app/portal/auth/verify/route.ts
  modified:
    - src/lib/types/database.ts

key-decisions:
  - "Used GHL email API instead of Resend for magic link delivery (GHL already integrated)"
  - "Separate cookie name ppl-broker-session to avoid admin session interference"
  - "15-minute token expiry for security"

patterns-established:
  - "Broker auth: separate session cookie from admin, getBrokerSession() helper"
  - "Magic links: token generation, DB storage, edge function email, verify route"

requirements-completed: [AUTH-01, AUTH-02]

duration: 8min
completed: 2026-03-17
---

# Plan 22-01: Magic Link Auth Infrastructure Summary

**Magic link auth backend with token storage, GHL email delivery, iron-session broker cookies, and /portal/auth/verify route handler**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files created:** 5
- **Files modified:** 1

## Accomplishments
- magic_links table migration with RLS (service role only)
- Broker session module with separate ppl-broker-session cookie
- sendMagicLink/verifyMagicLink/requestMagicLink/inviteBrokerToPortal server actions
- GHL-based edge function for sending branded magic link emails
- Token verification route that creates broker session and redirects

## Task Commits

1. **Task 1+2: Magic link infrastructure** - `8e58161` (feat)

## Files Created/Modified
- `supabase/migrations/00026_magic_links.sql` - Magic links table with token, broker FK, expiry, RLS
- `src/lib/auth/broker-session.ts` - BrokerSessionData interface and getBrokerSession helper
- `src/lib/types/database.ts` - Added magic_links table types
- `src/lib/actions/magic-link.ts` - Server actions for send, verify, request, invite
- `supabase/functions/send-magic-link/index.ts` - Edge function sending magic link email via GHL
- `src/app/portal/auth/verify/route.ts` - GET route validating token and creating session

## Decisions Made
- Used GHL email instead of Resend since GHL is already integrated in the project
- Edge function follows same Deno.serve + GHL API pattern as existing send-alert function
- Token lookup is case-insensitive on broker email for usability

## Deviations from Plan

### Auto-fixed Issues

**1. [Adaptation] Used GHL instead of Resend for email delivery**
- **Found during:** Task 2 (edge function creation)
- **Issue:** Plan specified Resend API but instructions say to use GHL since it's already integrated
- **Fix:** Edge function sends via GHL conversations/messages API with type: 'Email'
- **Files modified:** supabase/functions/send-magic-link/index.ts, src/lib/actions/magic-link.ts
- **Verification:** Pattern matches existing send-alert and deliver-ghl functions

---

**Total deviations:** 1 adaptation (Resend to GHL)
**Impact on plan:** Better integration with existing stack. No additional API keys needed.

## Issues Encountered
None

## User Setup Required
None - GHL API token already configured for existing delivery functions.

## Next Phase Readiness
- Backend infrastructure complete for Plan 22-02 (UI + route protection)
- Broker session module ready for portal layout auth guard
- Server actions ready for login form and admin invite button

---
*Phase: 22-broker-auth*
*Completed: 2026-03-17*
