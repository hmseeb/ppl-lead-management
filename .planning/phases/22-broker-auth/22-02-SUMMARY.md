---
phase: 22-broker-auth
plan: 02
subsystem: auth
tags: [portal-ui, magic-link, middleware, iron-session, next-app-router]

requires:
  - phase: 22-broker-auth
    provides: magic_links table, broker-session module, sendMagicLink/verifyMagicLink actions
provides:
  - Portal login page at /portal/login
  - Protected portal layout with auth guard
  - Placeholder portal home page
  - Admin invite-to-portal button
  - Middleware excluding portal from admin auth
affects: [broker-portal]

tech-stack:
  added: []
  patterns: [portal-route-group, broker-auth-guard]

key-files:
  created:
    - src/app/portal/layout.tsx
    - src/app/portal/login/page.tsx
    - src/app/portal/(protected)/layout.tsx
    - src/app/portal/(protected)/page.tsx
    - src/components/portal/portal-header.tsx
    - src/lib/actions/portal.ts
  modified:
    - src/middleware.ts
    - src/components/brokers/broker-quick-actions.tsx
    - src/app/(dashboard)/brokers/[id]/page.tsx

key-decisions:
  - "Used Next.js route groups: (protected) for auth guard, login/verify outside it"
  - "Portal uses same glass-card styling as admin login for brand consistency"
  - "Invite button placed between Test Webhook and Edit in quick actions toolbar"

patterns-established:
  - "Portal routes: /portal/login public, /portal/* protected via (protected) route group"
  - "Broker session check in layout, not middleware (middleware only handles admin auth)"

requirements-completed: [AUTH-01, AUTH-03, AUTH-04]

duration: 6min
completed: 2026-03-17
---

# Plan 22-02: Portal Login UI + Route Protection + Admin Invite Summary

**Portal login form with magic link flow, route-group auth guard, and admin invite button on broker detail page**

## Performance

- **Duration:** 6 min
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files created:** 6
- **Files modified:** 3

## Accomplishments
- Portal login page with branded magic link email form
- Protected portal layout with broker session auth guard
- Placeholder portal home showing broker name and email
- Admin "Invite to Portal" button on broker detail page
- Middleware updated to exclude /portal from admin auth
- PortalHeader with logout functionality

## Task Commits

1. **Task 1: Portal login + auth guard + middleware** - `61bd43b` (feat)
2. **Task 2: Admin invite button** - `53097ef` (feat)
3. **Task 3: Checkpoint** - auto-approved

## Files Created/Modified
- `src/app/portal/layout.tsx` - Portal layout shell
- `src/app/portal/login/page.tsx` - Magic link login form with success/error states
- `src/app/portal/(protected)/layout.tsx` - Auth guard checking broker session
- `src/app/portal/(protected)/page.tsx` - Placeholder portal home with broker info
- `src/components/portal/portal-header.tsx` - Header with brand, broker name, logout
- `src/lib/actions/portal.ts` - brokerLogout server action
- `src/middleware.ts` - Added 'portal' to matcher exclusion
- `src/components/brokers/broker-quick-actions.tsx` - Added Invite to Portal button
- `src/app/(dashboard)/brokers/[id]/page.tsx` - Pass email prop to quick actions

## Decisions Made
- Used Next.js route groups so login/verify routes bypass the auth guard layout
- Portal login page matches admin login visual style (glass-card, glow) for brand consistency
- Security: login form always shows "check your email" regardless of whether email exists

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None

## User Setup Required
None - uses existing GHL integration, no new API keys needed.

## Next Phase Readiness
- Complete broker auth flow is in place
- Portal is ready for future dashboard features
- Admin invite workflow functional

---
*Phase: 22-broker-auth*
*Completed: 2026-03-17*
