---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/queries/brokers.ts
  - src/lib/queries/orders.ts
  - src/lib/queries/unassigned.ts
  - src/lib/queries/activity.ts
  - src/components/brokers/brokers-filters.tsx
  - src/components/orders/orders-filters.tsx
  - src/components/unassigned/unassigned-filters.tsx
  - src/components/activity/activity-filters.tsx
  - src/app/(dashboard)/brokers/page.tsx
  - src/app/(dashboard)/orders/page.tsx
  - src/app/(dashboard)/unassigned/page.tsx
  - src/app/(dashboard)/activity/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Brokers page has search bar and assignment_status filter"
    - "Orders page has search bar, status filter, and vertical filter"
    - "Unassigned page has search bar and reason filter"
    - "Activity page has search bar alongside existing filters"
    - "All filters trigger server-side refetch via nuqs shallow:false"
  artifacts:
    - path: "src/components/brokers/brokers-filters.tsx"
      provides: "Search + assignment_status filter for brokers"
    - path: "src/components/orders/orders-filters.tsx"
      provides: "Search + status + vertical filter for orders"
    - path: "src/components/unassigned/unassigned-filters.tsx"
      provides: "Search + reason filter for unassigned"
  key_links:
    - from: "src/app/(dashboard)/brokers/page.tsx"
      to: "src/lib/queries/brokers.ts"
      via: "searchParams passed to fetchBrokersWithStats"
      pattern: "fetchBrokersWithStats.*search.*status"
    - from: "src/app/(dashboard)/orders/page.tsx"
      to: "src/lib/queries/orders.ts"
      via: "searchParams passed to fetchOrdersWithBroker"
      pattern: "fetchOrdersWithBroker.*search.*status.*vertical"
---

<objective>
Add search and filter UI to brokers, orders, unassigned, and activity pages. Copy the leads-filters pattern (nuqs with shallow:false for server-side filtering). Update query functions to accept and apply filter parameters.

Purpose: All table pages should have consistent search/filter UX matching the leads page.
Output: 4 filter components (3 new, 1 updated) + 4 updated query functions + 4 updated page files.
</objective>

<execution_context>
@/Users/haseeb/.claude/get-shit-done/workflows/execute-plan.md
@/Users/haseeb/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/leads/leads-filters.tsx (reference pattern for all filter components)
@src/lib/queries/leads.ts (reference pattern for query filtering)
@src/app/(dashboard)/leads/page.tsx (reference pattern for page wiring)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add filter params to all 4 query functions</name>
  <files>
    src/lib/queries/brokers.ts
    src/lib/queries/orders.ts
    src/lib/queries/unassigned.ts
    src/lib/queries/activity.ts
  </files>
  <action>
Update each query function's filter interface and query builder to accept and apply new params. Follow the exact pattern from leads.ts (conditional .ilike/.eq chaining on supabase query).

**src/lib/queries/brokers.ts** - `fetchBrokersWithStats`:
- Add to BrokerFilters interface: `search?: string`, `assignment_status?: string`
- Search: `.or('first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%')`
- Assignment status: `.eq('assignment_status', assignment_status)`
- Apply filters BEFORE the `.order()` and `.range()` calls. Since the current query is chained directly, refactor to use a `let query = supabase.from('brokers').select(...)` pattern (same as leads.ts) so filters can be conditionally applied.

**src/lib/queries/orders.ts** - `fetchOrdersWithBroker`:
- Add to OrderFilters interface: `search?: string`, `status?: string`, `vertical?: string`
- Search: search on broker name via the joined brokers table. Since supabase-js cannot filter on joined columns with `.or()`, use a different approach: use `.ilike('brokers.first_name', '%${search}%')` will NOT work with inner join. Instead, use `.textSearch` or a raw filter. The simplest approach: use `.or()` on the orders table's own columns if possible. Since orders don't have a name column, use a workaround: fetch with the filter on the brokers join. Actually, the cleanest approach for broker name search on orders is to use a Supabase RPC or to filter client-side for search only. BUT to keep it simple and server-side: change the join from `brokers!inner` to `brokers` (left join), and add a separate query approach. ACTUALLY the simplest correct approach: keep `brokers!inner` join and use supabase's `.or()` on the joined table. Test with: `query = query.or('first_name.ilike.%${search}%,last_name.ilike.%${search}%', { referencedTable: 'brokers' })`. The `referencedTable` option in `.or()` filters on the joined table. Use this approach.
- Status: `.eq('status', status)`
- Vertical: `.contains('verticals', [vertical])` (since verticals is a text[] array)
- Refactor to `let query = ...` pattern.

**src/lib/queries/unassigned.ts** - `fetchUnassignedQueue`:
- Add to UnassignedFilters interface: `search?: string`, `reason?: string`
- Search on lead name via joined leads table: `query = query.or('first_name.ilike.%${search}%,last_name.ilike.%${search}%', { referencedTable: 'leads' })`
- Reason: `.eq('reason', reason)`
- Refactor to `let query = ...` pattern.

**src/lib/queries/activity.ts** - `fetchActivityLog`:
- Add to ActivityFilters interface: `search?: string`
- Search on details column (jsonb cast to text): `query = query.ilike('details', '%${search}%')`. The details column is text type based on schema. If it's jsonb, use `query = query.textSearch('details', search)` or cast. Check the migration: details is `text` type. So use `.ilike('details', '%${search}%')`.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>All 4 query functions accept and apply search + relevant filter params. TypeScript compiles cleanly.</done>
</task>

<task type="auto">
  <name>Task 2: Create filter components and wire into pages</name>
  <files>
    src/components/brokers/brokers-filters.tsx
    src/components/orders/orders-filters.tsx
    src/components/unassigned/unassigned-filters.tsx
    src/components/activity/activity-filters.tsx
    src/app/(dashboard)/brokers/page.tsx
    src/app/(dashboard)/orders/page.tsx
    src/app/(dashboard)/unassigned/page.tsx
    src/app/(dashboard)/activity/page.tsx
  </files>
  <action>
Create 3 new filter components and update 1 existing. Copy the exact pattern from `src/components/leads/leads-filters.tsx`: 'use client', nuqs useQueryState with `shallow: false`, Input for search with `throttleMs: 300`, native select for dropdowns, Clear button with X icon.

**src/components/brokers/brokers-filters.tsx** (NEW):
- Search input: placeholder "Search name, company..."
- Assignment status select: options "All Status", "active", "inactive", "suspended"
- Clear button when any filter active

**src/components/orders/orders-filters.tsx** (NEW):
- Search input: placeholder "Search broker name..."
- Status select: options "All Status", "active", "paused", "completed", "cancelled"
- Vertical select: use the same VERTICALS array as leads-filters ('MCA', 'SBA', 'Equipment Finance', 'Working Capital', 'Lines of Credit'), options "All Verticals" + each
- Clear button when any filter active

**src/components/unassigned/unassigned-filters.tsx** (NEW):
- Search input: placeholder "Search lead name..."
- Reason select: options "All Reasons", "no_matching_order" (label: "No Matching Order"). Keep it simple since there's currently only one reason value but the select allows future expansion.
- Clear button when any filter active

**src/components/activity/activity-filters.tsx** (UPDATE existing):
- Add a search input as the FIRST element (before event type select): placeholder "Search details..."
- Use `searchSync` with `throttleMs: 300` for the search input (same as leads)
- Add search to hasFilters check and clearAll function
- Keep all existing filters (event_type, broker_id, date_from, date_to) unchanged

**Page wiring for brokers/page.tsx:**
- Wrap return in `<NuqsAdapter>` (import from 'nuqs/adapters/next/app')
- Import and render `<BrokersFilters />` between header and table
- Pass search params to fetchBrokersWithStats: `search: params.search || undefined, assignment_status: params.assignment_status || undefined`

**Page wiring for orders/page.tsx:**
- Wrap return in `<NuqsAdapter>`
- Import and render `<OrdersFilters />` between header and table
- Pass search params to fetchOrdersWithBroker: `search: params.search || undefined, status: params.status || undefined, vertical: params.vertical || undefined`

**Page wiring for unassigned/page.tsx:**
- Wrap return in `<NuqsAdapter>`
- Import and render `<UnassignedFilters />` between header and table
- Pass search params to fetchUnassignedQueue: `search: params.search || undefined, reason: params.reason || undefined`

**Page wiring for activity/page.tsx:**
- Already has `<NuqsAdapter>`, no wrapper change needed
- Pass `search: params.search || undefined` to fetchActivityLog (add to existing params)
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit --pretty 2>&1 | head -30 && echo "---" && bun run build 2>&1 | tail -20</automated>
  </verify>
  <done>All 4 pages render filter bars. Search inputs have throttled server-side filtering. Dropdown filters trigger immediate server refetch. Clear button resets all filters. Build passes with no errors.</done>
</task>

</tasks>

<verification>
- `bun run build` completes with no errors
- Visit /brokers: search bar and assignment_status dropdown visible, typing filters results
- Visit /orders: search bar, status dropdown, and vertical dropdown visible, all functional
- Visit /unassigned: search bar and reason dropdown visible, search filters by lead name
- Visit /activity: new search bar visible alongside existing event_type and broker filters
- All filters preserve pagination params and vice versa
</verification>

<success_criteria>
All 4 table pages have search + filter UI matching the leads page pattern. Filters trigger server-side refetch. TypeScript and build pass cleanly.
</success_criteria>

<output>
After completion, create `.planning/quick/3-add-search-and-filters-to-brokers-orders/3-SUMMARY.md`
</output>
