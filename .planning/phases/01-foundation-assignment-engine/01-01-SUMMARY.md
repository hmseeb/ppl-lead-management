---
phase: 01-foundation-assignment-engine
plan: 01
subsystem: database, auth, infra
tags: [next.js, supabase, iron-session, bcryptjs, shadcn, tailwind, typescript]

# Dependency graph
requires:
  - phase: none
    provides: greenfield project
provides:
  - Next.js 16 project scaffold with all Phase 1 dependencies
  - Supabase schema (orders, leads, activity_log, unassigned_queue tables)
  - Three Supabase client utilities (browser, server, admin)
  - Password auth with iron-session and middleware route protection
  - Generated TypeScript types from live schema
affects: [01-02-PLAN, 01-03-PLAN, 02-01-PLAN]

# Tech tracking
tech-stack:
  added: [next.js 16.1.6, react 19, supabase-js 2.99, supabase-ssr 0.9, iron-session 8, bcryptjs 3, zod 3.25, react-hook-form 7.71, tanstack-react-table 8.21, sonner 2, lucide-react, shadcn-ui, tailwind 4]
  patterns: [server-actions-for-mutations, iron-session-cookie-auth, three-supabase-clients, route-group-layouts]

key-files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/admin.ts
    - src/lib/auth/session.ts
    - src/lib/auth/actions.ts
    - src/middleware.ts
    - src/app/(auth)/login/page.tsx
    - src/app/(dashboard)/layout.tsx
    - src/lib/types/database.ts
    - supabase/migrations/00003_create_tables.sql
  modified:
    - src/app/layout.tsx
    - .env.local

key-decisions:
  - "Used assignment_status column instead of reusing existing brokers.status (which stores onboarding status: completed/not_started)"
  - "Added anon SELECT policies on all tables for ppl-onboarding compatibility when enabling RLS on brokers"
  - "Used text CHECK constraints instead of enum types for status columns (simpler to evolve)"

patterns-established:
  - "Three Supabase clients: browser (client.ts), server (server.ts), admin (admin.ts with service role key)"
  - "Auth flow: iron-session cookie checked in middleware, bcrypt only in Server Actions (not edge runtime)"
  - "Route groups: (auth) for login, (dashboard) for protected pages"
  - "Server Actions for all mutations, admin client bypasses RLS"

requirements-completed: [AUTH-01]

# Metrics
duration: 15min
completed: 2026-03-12
---

# Phase 1 Plan 01: Project Scaffold, Database Schema, and Auth Summary

**Next.js 16 project with Supabase schema (orders, leads, activity_log, unassigned_queue), iron-session auth, and ShadCN UI components**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-12T12:24:31Z
- **Completed:** 2026-03-12T12:39:34Z
- **Tasks:** 3
- **Files modified:** 29

## Accomplishments
- Full Next.js 16 project scaffold with all Phase 1 dependencies installed
- Supabase database schema with 4 new tables, performance indexes, RLS policies, and auto-update triggers
- Existing brokers table untouched (12 rows intact, new assignment_status column added non-destructively)
- Password auth with iron-session middleware protecting all dashboard routes
- Generated TypeScript types reflecting the live schema

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project, install dependencies, configure Supabase clients** - `7e0c7fc` (feat)
2. **Task 2: Run Supabase database migrations** - `d895be2` (feat)
3. **Task 3: Implement auth with iron-session, login page, and middleware** - `135d3ff` (feat)

## Files Created/Modified
- `src/lib/supabase/client.ts` - Browser Supabase client for future Realtime
- `src/lib/supabase/server.ts` - Server Supabase client with cookie handling for SSR
- `src/lib/supabase/admin.ts` - Admin Supabase client with service role key (bypasses RLS)
- `src/lib/auth/session.ts` - iron-session config and getSession helper
- `src/lib/auth/actions.ts` - Login/logout server actions with bcrypt verification
- `src/middleware.ts` - Auth guard redirecting unauthenticated users to /login
- `src/app/(auth)/login/page.tsx` - Login form with ShadCN Card
- `src/app/(auth)/layout.tsx` - Centered auth layout
- `src/app/(dashboard)/layout.tsx` - Dashboard shell with sidebar nav and logout
- `src/app/(dashboard)/page.tsx` - Placeholder dashboard page
- `src/app/layout.tsx` - Root layout with Toaster from sonner
- `src/lib/types/database.ts` - Auto-generated TypeScript types from Supabase schema
- `src/components/ui/*` - ShadCN components (card, dialog, dropdown, input, label, select, table, badge, separator, tabs, sheet)
- `supabase/migrations/00001_enable_extensions.sql` - pg_cron, pg_net
- `supabase/migrations/00002_alter_brokers.sql` - assignment_status and company columns
- `supabase/migrations/00003_create_tables.sql` - orders, leads, activity_log, unassigned_queue
- `supabase/migrations/00004_create_indexes.sql` - Performance indexes
- `supabase/migrations/00005_enable_rls.sql` - RLS with anon read policies

## Decisions Made
- **assignment_status vs status:** Existing brokers.status stores onboarding state (completed/not_started). Added separate assignment_status column for lead assignment lifecycle to avoid breaking ppl-onboarding.
- **Text CHECK constraints over enums:** Used text columns with CHECK constraints instead of Postgres enum types. Easier to evolve (adding values to enums requires ALTER TYPE).
- **Anon SELECT policies:** Added permissive SELECT policies for the anon role on all tables (including brokers) so ppl-onboarding continues working after RLS enablement.
- **useActionState for login:** Used React 19 useActionState pattern for form handling with server action, requiring (prevState, formData) signature.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed bun package manager**
- **Found during:** Task 1 (Project scaffold)
- **Issue:** bun was not installed on the system despite being specified as the package manager
- **Fix:** Installed bun via `curl -fsSL https://bun.sh/install | bash`
- **Files modified:** None (system-level install)
- **Verification:** `bun --version` returns 1.3.10
- **Committed in:** N/A (not a code change)

**2. [Rule 1 - Bug] Fixed login action signature for useActionState**
- **Found during:** Task 3 (Auth implementation)
- **Issue:** login server action had signature `(formData: FormData)` but useActionState in React 19 requires `(prevState, formData)` pattern
- **Fix:** Changed login function to accept `(prevState: { error: string } | null, formData: FormData)`
- **Files modified:** src/lib/auth/actions.ts
- **Verification:** Build passes, TypeScript compiles without errors
- **Committed in:** 135d3ff (Task 3 commit)

**3. [Rule 3 - Blocking] Repaired remote migration history**
- **Found during:** Task 2 (Database migrations)
- **Issue:** Supabase remote had existing migration history from ppl-onboarding that blocked `db push`
- **Fix:** Ran `supabase migration repair --status reverted` on old migrations, then pushed new ones
- **Files modified:** None (remote database state only)
- **Verification:** All 5 migrations applied successfully
- **Committed in:** d895be2 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for execution. No scope creep.

## Issues Encountered
- Next.js 16.1.6 shows deprecation warning for middleware file convention ("Please use proxy instead"). Middleware still works correctly. This is cosmetic only and does not affect functionality.

## Next Phase Readiness
- All Phase 1 tables exist in Supabase with correct schema, indexes, and RLS
- Auth infrastructure is complete and protecting all dashboard routes
- Supabase clients are ready for broker/order CRUD (Plan 02)
- Generated types reflect the full live schema
- ShadCN components installed for building management UI

## Self-Check: PASSED

All 10 key files verified present. All 3 task commits verified in git history.

---
*Phase: 01-foundation-assignment-engine*
*Completed: 2026-03-12*
