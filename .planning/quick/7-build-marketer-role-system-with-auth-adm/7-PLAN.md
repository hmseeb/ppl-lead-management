---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # Task 1: DB + Auth
  - supabase/migrations/20260326_marketers.sql
  - src/lib/types/database.ts
  - src/lib/auth/marketer-session.ts
  - src/lib/auth/role.ts
  - src/lib/actions/marketer-magic-link.ts
  - src/app/marketer/login/page.tsx
  - src/app/marketer/auth/callback/page.tsx
  - src/app/marketer/auth/callback/actions.ts
  - src/app/marketer/layout.tsx
  - src/middleware.ts
  # Task 2: Sidebar + Query filtering + Page integration
  - src/components/layout/sidebar.tsx
  - src/app/(dashboard)/layout.tsx
  - src/lib/queries/dashboard.ts
  - src/lib/queries/leads.ts
  - src/lib/queries/brokers.ts
  - src/lib/queries/orders.ts
  - src/lib/queries/unassigned.ts
  - src/lib/queries/activity.ts
  - src/lib/queries/call-reporting.ts
  - src/app/(dashboard)/page.tsx
  - src/app/(dashboard)/leads/page.tsx
  - src/app/(dashboard)/brokers/page.tsx
  - src/app/(dashboard)/orders/page.tsx
  - src/app/(dashboard)/unassigned/page.tsx
  - src/app/(dashboard)/activity/page.tsx
  - src/app/(dashboard)/calls/page.tsx
  - src/app/(dashboard)/brokers/[id]/page.tsx
  # Task 3: Admin marketers page + action restrictions
  - src/app/(dashboard)/marketers/page.tsx
  - src/lib/queries/marketers.ts
  - src/lib/actions/marketers.ts
  - src/components/marketers/marketers-table.tsx
  - src/components/marketers/marketer-form.tsx
  - src/components/marketers/marketer-broker-assign.tsx
autonomous: true
requirements: [QUICK-7]
must_haves:
  truths:
    - "Marketer can log in at /marketer/login via magic link and land on the same dashboard"
    - "Marketer sees only their assigned brokers' data across all pages"
    - "Marketer sidebar hides Settings and Marketers links"
    - "Marketer can assign unassigned leads to their brokers only"
    - "Marketer cannot create orders or edit broker settings"
    - "Admin can manage marketers (CRUD + broker assignment) at /marketers"
    - "Admin functionality is completely unaffected"
    - "Overview stats for marketer reflect only their brokers' numbers"
  artifacts:
    - path: "src/lib/auth/marketer-session.ts"
      provides: "Marketer iron-session with ppl-marketer-session cookie"
    - path: "src/lib/auth/role.ts"
      provides: "getRole() returning admin | marketer, getMarketerBrokerIds()"
    - path: "src/app/marketer/login/page.tsx"
      provides: "Marketer magic link login page"
    - path: "src/app/(dashboard)/marketers/page.tsx"
      provides: "Admin-only marketer management page"
    - path: "supabase/migrations/20260326_marketers.sql"
      provides: "marketers + marketer_brokers tables"
  key_links:
    - from: "src/middleware.ts"
      to: "src/lib/auth/session.ts + src/lib/auth/marketer-session.ts"
      via: "Check both admin AND marketer sessions before redirecting to /login"
      pattern: "getIronSession.*marketerSession"
    - from: "src/lib/auth/role.ts"
      to: "src/lib/auth/session.ts + src/lib/auth/marketer-session.ts"
      via: "getRole() checks which session is active"
      pattern: "getRole.*admin.*marketer"
    - from: "src/app/(dashboard)/layout.tsx"
      to: "src/lib/auth/role.ts"
      via: "Passes role + brokerIds to Sidebar"
      pattern: "getRole|getMarketerBrokerIds"
    - from: "src/lib/queries/*.ts"
      to: "marketer_brokers junction"
      via: "broker_ids filter narrows all queries"
      pattern: "broker_ids.*\\.in\\("
---

<objective>
Build a complete marketer role system: authentication via magic links, role-based sidebar/data filtering across all dashboard pages, admin marketer management page, and action restrictions.

Purpose: Marketers need a filtered view of the admin dashboard showing only their assigned brokers' data, with ability to assign unassigned leads to their brokers.
Output: Working marketer auth flow, role-filtered dashboard, admin /marketers CRUD page.
</objective>

<execution_context>
@src/lib/auth/session.ts
@src/lib/auth/broker-session.ts
@src/lib/auth/actions.ts
@src/lib/actions/magic-link.ts
@src/app/portal/auth/callback/page.tsx
@src/app/portal/auth/callback/actions.ts
@src/app/portal/login/page.tsx
@src/middleware.ts
@src/components/layout/sidebar.tsx
@src/app/(dashboard)/layout.tsx
@src/lib/queries/dashboard.ts
@src/lib/queries/leads.ts
@src/lib/queries/brokers.ts
@src/lib/queries/orders.ts
@src/lib/queries/unassigned.ts
@src/lib/queries/activity.ts
@src/lib/queries/call-reporting.ts
@src/lib/types/database.ts
</execution_context>

<context>
This is a live production app. The admin login uses a password-based iron-session (cookie: ppl-session).
Broker portal uses Supabase Auth magic links + iron-session (cookie: ppl-broker-session).
The marketer flow follows the broker pattern: Supabase Auth magic link -> callback -> iron-session (cookie: ppl-marketer-session).

Key constraints:
- NEVER break existing admin auth. Admin password login at /login must keep working.
- NEVER break existing broker portal. Broker magic link login at /portal/login must keep working.
- Middleware currently only checks ppl-session. Must also check ppl-marketer-session.
- All query functions use createAdminClient() (service role). Filtering is done via query params, not RLS.
- Marketers share the same (dashboard) routes as admin. Role detection determines what they see.
- Brokers can be shared between marketers (many-to-many via marketer_brokers).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database schema, marketer auth flow, role detection, middleware</name>
  <files>
    supabase/migrations/20260326_marketers.sql
    src/lib/types/database.ts
    src/lib/auth/marketer-session.ts
    src/lib/auth/role.ts
    src/lib/actions/marketer-magic-link.ts
    src/app/marketer/login/page.tsx
    src/app/marketer/auth/callback/page.tsx
    src/app/marketer/auth/callback/actions.ts
    src/app/marketer/layout.tsx
    src/middleware.ts
  </files>
  <action>
    **1. Database migration** (`supabase/migrations/20260326_marketers.sql`):
    Create the `marketers` table:
    ```sql
    create table marketers (
      id uuid primary key default gen_random_uuid(),
      email text not null unique,
      first_name text not null,
      last_name text not null,
      phone text,
      status text not null default 'active' check (status in ('active', 'inactive')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    ```
    Create the `marketer_brokers` junction table:
    ```sql
    create table marketer_brokers (
      id uuid primary key default gen_random_uuid(),
      marketer_id uuid not null references marketers(id) on delete cascade,
      broker_id uuid not null references brokers(id) on delete cascade,
      created_at timestamptz not null default now(),
      unique(marketer_id, broker_id)
    );
    create index idx_marketer_brokers_marketer on marketer_brokers(marketer_id);
    create index idx_marketer_brokers_broker on marketer_brokers(broker_id);
    ```

    Run this migration against the database with the Supabase CLI or directly via the Supabase SQL editor (just generate the file, the user will run it).

    **2. Update database types** (`src/lib/types/database.ts`):
    Add `marketers` and `marketer_brokers` table types to the Database interface following the exact same pattern as existing tables. The marketers table has: id, email, first_name, last_name, phone, status, created_at, updated_at. The marketer_brokers table has: id, marketer_id, broker_id, created_at.

    **3. Marketer session** (`src/lib/auth/marketer-session.ts`):
    Follow the exact pattern of `src/lib/auth/broker-session.ts`. Create:
    - `MarketerSessionData` interface with `isMarketer: boolean` and `marketerId: string`
    - `marketerSessionOptions` with cookieName `'ppl-marketer-session'`, same password/cookie options
    - `getMarketerSession()` async function using `cookies()` and `getIronSession`

    **4. Role detection helper** (`src/lib/auth/role.ts`):
    ```typescript
    import { getSession } from './session'
    import { getMarketerSession } from './marketer-session'
    import { createAdminClient } from '@/lib/supabase/admin'

    export type Role = 'admin' | 'marketer'

    export async function getRole(): Promise<Role> {
      const session = await getSession()
      if (session.isLoggedIn) return 'admin'
      const marketerSession = await getMarketerSession()
      if (marketerSession.isMarketer) return 'marketer'
      // This should not happen (middleware should have redirected), but default to admin
      return 'admin'
    }

    export async function getMarketerBrokerIds(): Promise<string[]> {
      const marketerSession = await getMarketerSession()
      if (!marketerSession.isMarketer) return []
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('marketer_brokers')
        .select('broker_id')
        .eq('marketer_id', marketerSession.marketerId)
      return (data ?? []).map(r => r.broker_id)
    }

    // Helper: get marketer ID if role is marketer, null otherwise
    export async function getMarketerId(): Promise<string | null> {
      const marketerSession = await getMarketerSession()
      return marketerSession.isMarketer ? marketerSession.marketerId : null
    }
    ```

    **5. Marketer magic link action** (`src/lib/actions/marketer-magic-link.ts`):
    Follow the pattern of `src/lib/actions/magic-link.ts` but look up `marketers` table instead of `brokers`:
    - `sendMarketerMagicLink(email)`: look up marketer by email (case-insensitive ilike), if not found return `{ error: 'no_marketer' }`. Use `supabase.auth.signInWithOtp` with `emailRedirectTo` pointing to `${getAppUrl()}/marketer/auth/callback`. Use `shouldCreateUser: true`.
    - `requestMarketerMagicLink(prevState, formData)`: extract email from formData, always return `{ success: true }` regardless (security).

    **6. Marketer auth callback** (`src/app/marketer/auth/callback/actions.ts`):
    Follow the pattern of `src/app/portal/auth/callback/actions.ts`:
    - `createMarketerSessionFromEmail(email)`: look up marketer by email (ilike), create iron-session with `isMarketer: true` and `marketerId: marketer.id`.

    **7. Marketer auth callback page** (`src/app/marketer/auth/callback/page.tsx`):
    Follow the pattern of `src/app/portal/auth/callback/page.tsx` exactly, but:
    - Import `createMarketerSessionFromEmail` instead of `createBrokerSessionFromEmail`
    - On success, redirect to `/` (the dashboard) instead of `/portal`
    - On failure, redirect to `/marketer/login?error=invalid_link`
    - Branding: "PPL Lead Mgmt" / "Marketer Access" instead of "PPL Portal" / "Broker Access"

    **8. Marketer layout** (`src/app/marketer/layout.tsx`):
    Simple pass-through layout (just renders children). No auth check needed here since these are only login/callback pages.

    **9. Marketer login page** (`src/app/marketer/login/page.tsx`):
    Follow the pattern of `src/app/portal/login/page.tsx` exactly, but:
    - Import `requestMarketerMagicLink` instead of `requestMagicLink`
    - Branding: "PPL Lead Mgmt" / "Marketer Access"
    - Same glass-card styling, same error handling, same success state

    **10. Update middleware** (`src/middleware.ts`):
    The middleware currently checks only `ppl-session`. Update it to also check `ppl-marketer-session`:
    ```typescript
    import { marketerSessionOptions, MarketerSessionData } from '@/lib/auth/marketer-session'

    // Inside middleware function, after checking admin session:
    if (!session.isLoggedIn) {
      // Check marketer session before redirecting
      const marketerSession = await getIronSession<MarketerSessionData>(
        request,
        response,
        marketerSessionOptions
      )
      if (!marketerSession.isMarketer) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }
    ```
    Also update the matcher to exclude `marketer` paths (login/callback):
    ```typescript
    matcher: ['/((?!login|portal|marketer|api|_next/static|_next/image|favicon.ico).*)'],
    ```
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit 2>&1 | head -30</automated>
    <manual>Visit /marketer/login, enter a marketer email, verify the page renders without errors</manual>
  </verify>
  <done>
    - marketers and marketer_brokers migration file exists
    - database.ts has both new table types
    - Marketer can visit /marketer/login, enter email, receive magic link
    - Magic link callback creates marketer session and redirects to /
    - getRole() returns 'admin' for admin sessions, 'marketer' for marketer sessions
    - getMarketerBrokerIds() returns broker IDs assigned to current marketer
    - Middleware allows both admin and marketer sessions to access dashboard routes
    - Middleware excludes /marketer/* from auth check
    - Existing admin login at /login still works unchanged
  </done>
</task>

<task type="auto">
  <name>Task 2: Role-aware sidebar, data filtering across all queries and pages</name>
  <files>
    src/components/layout/sidebar.tsx
    src/app/(dashboard)/layout.tsx
    src/lib/queries/dashboard.ts
    src/lib/queries/leads.ts
    src/lib/queries/brokers.ts
    src/lib/queries/orders.ts
    src/lib/queries/unassigned.ts
    src/lib/queries/activity.ts
    src/lib/queries/call-reporting.ts
    src/app/(dashboard)/page.tsx
    src/app/(dashboard)/leads/page.tsx
    src/app/(dashboard)/brokers/page.tsx
    src/app/(dashboard)/orders/page.tsx
    src/app/(dashboard)/unassigned/page.tsx
    src/app/(dashboard)/activity/page.tsx
    src/app/(dashboard)/calls/page.tsx
    src/app/(dashboard)/brokers/[id]/page.tsx
    src/lib/auth/actions.ts
  </files>
  <action>
    **A. Update sidebar to accept role prop** (`src/components/layout/sidebar.tsx`):
    - Add props: `role: 'admin' | 'marketer'`
    - Filter `navItems` based on role:
      - Marketer CANNOT see: `/settings`, `/marketers`
      - Marketer CAN see: `/` (overview), `/leads`, `/brokers`, `/orders`, `/unassigned`, `/activity`, `/calls`
    - Add a `/marketers` nav item (icon: `UserCog` from lucide-react) to the list. Only shown for admin role.
    - Show role indicator in sidebar brand area: change subtitle from "Control Panel" to "Marketer View" when role is 'marketer'
    - The logout action for marketer should destroy the marketer session, not the admin session. Add a `marketerLogout` server action in `src/lib/auth/actions.ts`:
      ```typescript
      export async function marketerLogout() {
        const session = await getMarketerSession()
        session.destroy()
        redirect('/marketer/login')
      }
      ```
    - Pass the correct logout action based on role. Since this is a client component that uses server actions, pass the logout form action as a prop or conditionally import. Simplest approach: add a `logoutAction` prop to Sidebar that is the server action to call in the form. The layout passes `logout` for admin and `marketerLogout` for marketer.

    **B. Update dashboard layout** (`src/app/(dashboard)/layout.tsx`):
    - Import `getRole` from `@/lib/auth/role`
    - Make it async, call `const role = await getRole()`
    - Pass `role` to `<Sidebar role={role} />`
    - Import and pass the appropriate logout action based on role

    **C. Add broker_ids filter to ALL query functions**:
    The pattern: every query function that currently accepts filters gets an optional `broker_ids?: string[]` parameter. When provided, filter results to only those broker IDs.

    **`src/lib/queries/dashboard.ts`** - `fetchKpis`, `fetchLeadVolume`, `fetchDeliveryStats`, `fetchRecentActivity`:
    - Add `broker_ids?: string[]` to DashboardFilters type (or accept as separate param).
    - Actually, better approach: add it as a separate function parameter since DashboardFilters is a shared type. Each function gets `brokerIds?: string[]` as a second param.
    - In `fetchKpis`: when brokerIds provided, add `.in('assigned_broker_id', brokerIds)` to lead queries and `.in('broker_id', brokerIds)` to delivery/broker/order queries.
    - In `fetchLeadVolume`: add `.in('assigned_broker_id', brokerIds)` filter.
    - In `fetchDeliveryStats`: add `.in('broker_id', brokerIds)` to delivery queries, `.in('assigned_broker_id', brokerIds)` to lead queries.
    - In `fetchRecentActivity`: add `.in('broker_id', brokerIds)` filter.
    - In `fetchRevenueSummary`: add `brokerIds?: string[]` param. When provided, filter orders to `.in('broker_id', brokerIds)`.

    **`src/lib/queries/leads.ts`** - `fetchLeads`, `fetchBrokersForFilter`:
    - Add `broker_ids?: string[]` to LeadFilters.
    - When provided: `query = query.in('assigned_broker_id', brokerIds)`.
    - `fetchBrokersForFilter(brokerIds?: string[])`: when provided, add `.in('id', brokerIds)` to only show the marketer's brokers in the filter dropdown.

    **`src/lib/queries/brokers.ts`** - `fetchBrokersWithStats`:
    - Add `broker_ids?: string[]` to BrokerFilters.
    - When provided: `query = query.in('id', brokerIds)`.

    **`src/lib/queries/orders.ts`** - `fetchOrdersWithBroker`:
    - Add `broker_ids?: string[]` to OrderFilters.
    - When provided: `query = query.in('broker_id', brokerIds)`.

    **`src/lib/queries/unassigned.ts`** - `fetchActiveBrokersWithOrders`:
    - Add `brokerIds?: string[]` param.
    - When provided: filter the brokers query to `.in('id', brokerIds)` so marketer can only assign to their brokers.
    - `fetchUnassignedQueue` does NOT get filtered. Marketer sees ALL unassigned leads (per design decision).

    **`src/lib/queries/activity.ts`** - `fetchActivityLog`, `fetchBrokersForActivityFilter`:
    - Add `broker_ids?: string[]` to ActivityFilters.
    - When provided: `query = query.in('broker_id', brokerIds)`.
    - `fetchBrokersForActivityFilter(brokerIds?: string[])`: when provided, filter to marketer's brokers.

    **`src/lib/queries/call-reporting.ts`** - `fetchCallKpis`, `fetchCallOutcomeVolume`, `fetchUpcomingCallbacks`:
    - Add `brokerIds?: string[]` param to each.
    - When provided: add `.in('broker_id', brokerIds)` to call_logs and callbacks queries.

    **D. Update ALL page components to pass broker_ids**:

    Each page in `src/app/(dashboard)/` needs to:
    1. Import `getRole` and `getMarketerBrokerIds` from `@/lib/auth/role`
    2. Call them at the top of the async page function
    3. Pass `brokerIds` to query functions when role is 'marketer'

    **`src/app/(dashboard)/page.tsx`** (Overview):
    - Get role + brokerIds
    - Pass brokerIds to `fetchKpis(filters, brokerIds)`, `fetchRecentActivity(filters, undefined, brokerIds)`, `fetchLeadVolume(filters, brokerIds)`, `fetchDeliveryStats(filters, brokerIds)`, `fetchBrokersForFilter(brokerIds)`, `fetchRevenueSummary(brokerIds)`

    **`src/app/(dashboard)/leads/page.tsx`**:
    - Get role + brokerIds
    - Pass `broker_ids` in the filters object to `fetchLeads`
    - Pass brokerIds to `fetchBrokersForFilter(brokerIds)`
    - Pass brokerIds to `fetchActiveBrokersWithOrders(brokerIds)`

    **`src/app/(dashboard)/brokers/page.tsx`**:
    - Get role + brokerIds
    - Pass `broker_ids` in filters to `fetchBrokersWithStats`
    - Hide "New Broker" button when role is 'marketer' (pass role as prop or conditionally render)

    **`src/app/(dashboard)/brokers/[id]/page.tsx`**:
    - Get role + brokerIds
    - If role is 'marketer' and the broker ID is not in brokerIds, return "Not authorized" page
    - Hide `BrokerQuickActions` when role is 'marketer' (marketers cannot edit broker settings)

    **`src/app/(dashboard)/orders/page.tsx`**:
    - Get role + brokerIds
    - Pass `broker_ids` in filters to `fetchOrdersWithBroker`
    - Hide "New Order" button when role is 'marketer'

    **`src/app/(dashboard)/unassigned/page.tsx`**:
    - Get role + brokerIds
    - Pass brokerIds to `fetchActiveBrokersWithOrders(brokerIds)` so marketer can only assign to their brokers
    - Do NOT filter the queue itself (marketer sees ALL unassigned leads)

    **`src/app/(dashboard)/activity/page.tsx`**:
    - Get role + brokerIds
    - Pass `broker_ids` in filters to `fetchActivityLog`
    - Pass brokerIds to `fetchBrokersForActivityFilter(brokerIds)`

    **`src/app/(dashboard)/calls/page.tsx`**:
    - Get role + brokerIds
    - Pass brokerIds to `fetchCallKpis(filters, brokerIds)`, `fetchCallOutcomeVolume(filters, brokerIds)`, `fetchBrokersForFilter(brokerIds)`

    **E. Update auth actions** (`src/lib/auth/actions.ts`):
    - Add `marketerLogout` server action that destroys marketer session and redirects to `/marketer/login`
    - Import `getMarketerSession` from `./marketer-session`
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit 2>&1 | head -30</automated>
    <manual>Log in as admin, verify all pages work identically. Check that /marketers appears in sidebar. Log in as marketer, verify Settings is hidden from sidebar, data is filtered to assigned brokers only.</manual>
  </verify>
  <done>
    - Sidebar shows/hides items based on role (Settings hidden for marketer, Marketers visible for admin)
    - Sidebar shows "Marketer View" subtitle for marketer role
    - Marketer logout redirects to /marketer/login
    - All query functions accept optional broker_ids filter
    - All dashboard pages detect role and pass broker_ids when marketer
    - Overview stats reflect only marketer's brokers' numbers
    - Leads page shows only leads assigned to marketer's brokers
    - Brokers page shows only marketer's assigned brokers (no "New Broker" button)
    - Broker detail page blocks access to non-assigned brokers, hides quick actions
    - Orders page shows only orders for marketer's brokers (no "New Order" button)
    - Unassigned page shows ALL leads but assignment dropdown only shows marketer's brokers
    - Activity page shows only marketer's brokers' activity
    - Calls page shows only marketer's brokers' call data
    - Admin functionality is completely unaffected (brokerIds is undefined for admin, no filtering applied)
  </done>
</task>

<task type="auto">
  <name>Task 3: Admin /marketers management page with broker assignment</name>
  <files>
    src/lib/queries/marketers.ts
    src/lib/actions/marketers.ts
    src/app/(dashboard)/marketers/page.tsx
    src/components/marketers/marketers-table.tsx
    src/components/marketers/marketer-form.tsx
    src/components/marketers/marketer-broker-assign.tsx
  </files>
  <action>
    **1. Marketer queries** (`src/lib/queries/marketers.ts`):
    - `fetchMarketers(params?: { search?: string, status?: string, page?: number, per_page?: number })`:
      Query `marketers` table with search (first_name, last_name, email ilike), status filter, pagination.
      Also select a count of assigned brokers via a subquery or join:
      ```typescript
      .select(`
        id, email, first_name, last_name, phone, status, created_at,
        marketer_brokers ( broker_id )
      `, { count: 'exact' })
      ```
      Map results to include `broker_count: marketer.marketer_brokers?.length ?? 0`.

    - `fetchMarketerDetail(id: string)`:
      Get marketer + their assigned brokers with broker names:
      ```typescript
      .from('marketers').select('*').eq('id', id).single()
      ```
      Then fetch assigned brokers:
      ```typescript
      .from('marketer_brokers')
        .select('broker_id, brokers ( id, first_name, last_name, company, email )')
        .eq('marketer_id', id)
      ```

    - `fetchAllBrokersForAssignment()`:
      Get all brokers (id, first_name, last_name, company) for the assignment UI.

    **2. Marketer actions** (`src/lib/actions/marketers.ts`):
    - `createMarketer(data: { email: string, first_name: string, last_name: string, phone?: string })`:
      Insert into marketers table. Validate email is unique. Revalidate `/marketers`.

    - `updateMarketer(id: string, data: { email: string, first_name: string, last_name: string, phone?: string, status: string })`:
      Update marketer row. Revalidate `/marketers`.

    - `deleteMarketer(id: string)`:
      Delete marketer (cascade will remove marketer_brokers). Revalidate `/marketers`.

    - `assignBrokersToMarketer(marketerId: string, brokerIds: string[])`:
      Replace all broker assignments for this marketer:
      1. Delete all existing `marketer_brokers` where `marketer_id = marketerId`
      2. Insert new rows for each brokerIds entry
      3. Revalidate `/marketers`
      This is a full replace (not additive) to keep the UI simple.

    **3. Marketers page** (`src/app/(dashboard)/marketers/page.tsx`):
    - Admin-only page. At the top, check `getRole()`. If role is 'marketer', redirect to `/` or show "Not authorized".
    - Fetch marketers list with pagination.
    - Render: heading "Marketers", count badge, "New Marketer" button (opens dialog).
    - Use the same NuqsAdapter + pagination pattern as other pages.

    **4. Marketers table** (`src/components/marketers/marketers-table.tsx`):
    Client component. Displays a table with columns: Name, Email, Phone, Status (badge), Brokers (count), Created, Actions (Edit, Delete).
    - Each row has an "Edit" button that opens a dialog with MarketerForm.
    - Each row has a "Manage Brokers" button that opens MarketerBrokerAssign dialog.
    - Delete has a confirmation dialog.
    - Follow the same glass-card table styling pattern as BrokersTable.

    **5. Marketer form** (`src/components/marketers/marketer-form.tsx`):
    Client component. Dialog with form fields: first_name, last_name, email, phone, status (select: active/inactive).
    - Used for both create and edit (pass optional `marketer` prop).
    - On submit, calls `createMarketer` or `updateMarketer` server action.
    - Use the existing Input, Label, Button, Dialog components.

    **6. Marketer broker assignment** (`src/components/marketers/marketer-broker-assign.tsx`):
    Client component. Dialog showing:
    - Left: list of all brokers (checkboxes)
    - Search filter for broker list
    - Shows currently assigned brokers as checked
    - "Save" button calls `assignBrokersToMarketer(marketerId, selectedBrokerIds)`
    - Use a simple multi-select checklist pattern, not a complex drag-and-drop.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit 2>&1 | head -30</automated>
    <manual>Navigate to /marketers as admin. Create a marketer, assign brokers, verify the marketer appears in the table. Edit and delete a marketer. Verify marketer role users cannot access /marketers.</manual>
  </verify>
  <done>
    - /marketers page exists with full CRUD for marketers (admin only)
    - Can create a marketer with email, name, phone
    - Can edit marketer details and status
    - Can delete a marketer (cascade deletes assignments)
    - Can assign/unassign brokers to a marketer via checkbox UI
    - Marketer role redirected away from /marketers page
    - All actions revalidate the page
    - Table shows broker count per marketer
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. `bun run build` completes successfully
3. Admin login at /login works exactly as before
4. Broker login at /portal/login works exactly as before
5. New /marketer/login page renders and sends magic links
6. Admin sees all nav items including /marketers
7. Marketer sees filtered nav (no Settings, no Marketers)
8. All data pages filter correctly for marketer role
9. Marketer can assign unassigned leads only to their brokers
10. Admin /marketers page has full CRUD + broker assignment
</verification>

<success_criteria>
- Zero regressions to existing admin and broker portal functionality
- Marketer can authenticate via magic link and see filtered dashboard
- All 7 dashboard pages (overview, leads, brokers, orders, unassigned, activity, calls) correctly filter data by marketer's assigned broker IDs
- Admin can create, edit, delete marketers and assign brokers at /marketers
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/7-build-marketer-role-system-with-auth-adm/7-SUMMARY.md`
</output>
