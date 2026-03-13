---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/actions/dashboard.ts
  - src/components/dashboard/kpi-cards.tsx
autonomous: true
requirements: [QUICK-2]

must_haves:
  truths:
    - "Clicking a KPI card expands an inline table below the card row showing 5-8 rows of underlying data"
    - "Only one card can be expanded at a time (clicking another collapses the previous)"
    - "Data is fetched lazily on click, not on page load"
    - "Each expanded section has a 'View all' link navigating to the correct filtered page"
    - "Clicking the same card again collapses it"
  artifacts:
    - path: "src/lib/actions/dashboard.ts"
      provides: "Server actions for lazy-fetching KPI detail rows"
      exports: ["fetchLeadsTodayPreview", "fetchAssignedPreview", "fetchUnassignedPreview", "fetchActiveBrokersPreview", "fetchActiveOrdersPreview"]
    - path: "src/components/dashboard/kpi-cards.tsx"
      provides: "Interactive KPI cards with expandable preview tables"
      contains: "'use client'"
  key_links:
    - from: "src/components/dashboard/kpi-cards.tsx"
      to: "src/lib/actions/dashboard.ts"
      via: "server action calls on card click"
      pattern: "fetchLeadsTodayPreview|fetchAssignedPreview|fetchUnassignedPreview|fetchActiveBrokersPreview|fetchActiveOrdersPreview"
---

<objective>
Make KPI cards on the overview page clickable with inline expandable tables. Clicking a card reveals an accordion-style table below the entire KPI row showing 5-8 rows of the underlying data. Only one card expands at a time. Data is fetched lazily via server actions on click.

Purpose: Let users quickly glance at what's behind the numbers without navigating away from the overview page.
Output: Interactive KPI cards with expandable preview tables and "View all" links.
</objective>

<execution_context>
@/Users/haseeb/.claude/get-shit-done/workflows/execute-plan.md
@/Users/haseeb/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/dashboard/kpi-cards.tsx
@src/lib/queries/dashboard.ts
@src/app/(dashboard)/page.tsx
@src/lib/queries/leads.ts
@src/lib/queries/brokers.ts
@src/lib/queries/orders.ts
@src/lib/queries/unassigned.ts
@src/components/ui/table.tsx
@src/lib/actions/leads.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create server actions for KPI detail row fetching</name>
  <files>src/lib/actions/dashboard.ts</files>
  <action>
Create a new server action file `src/lib/actions/dashboard.ts` with `'use server'` directive. Use `createAdminClient` from `@/lib/supabase/admin` and `date-fns` utilities (same pattern as `src/lib/queries/dashboard.ts`).

Create 5 server actions, each returning a small preview dataset (limit 8 rows):

1. **`fetchLeadsTodayPreview()`** - Query `leads` table where `created_at >= startOfDay(now)`, select `id, first_name, last_name, phone, vertical, credit_score, status, created_at`, order by `created_at desc`, limit 8. Return typed array.

2. **`fetchAssignedPreview()`** - Query `leads` where `status = 'assigned'`, select `id, first_name, last_name, vertical, credit_score, assigned_at, assigned_broker_id`, join `brokers!leads_assigned_broker_id_fkey (first_name, last_name)`, order by `assigned_at desc`, limit 8. Return typed array.

3. **`fetchUnassignedPreview()`** - Query `unassigned_queue` where `resolved = false`, join `leads!inner (id, first_name, last_name, vertical, credit_score, created_at)`, select `id, reason, created_at, leads(...)`, order by `created_at desc`, limit 8. Return typed array.

4. **`fetchActiveBrokersPreview()`** - Query `brokers` where `assignment_status = 'active'`, select `id, first_name, last_name, company, email, assignment_status`, order by `first_name asc`, limit 8. Return typed array.

5. **`fetchActiveOrdersPreview()`** - Query `orders` where `status = 'active'`, join `brokers!inner (first_name, last_name)`, select `id, broker_id, total_leads, leads_delivered, leads_remaining, verticals, status, brokers(...)`, order by `created_at desc`, limit 8. Return typed array.

Each action should handle errors gracefully by returning an empty array on failure. Define a union type `KpiPreviewType` as `'leads_today' | 'assigned' | 'unassigned' | 'active_brokers' | 'active_orders'` and export it.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit src/lib/actions/dashboard.ts 2>&1 | head -20</automated>
  </verify>
  <done>Five server actions exist, each returning typed preview data with limit 8, all passing TypeScript type checking.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite KPI cards as interactive client component with expandable preview tables</name>
  <files>src/components/dashboard/kpi-cards.tsx</files>
  <action>
Rewrite `src/components/dashboard/kpi-cards.tsx` as a `'use client'` component. Keep the existing `KpiData` interface and visual card styling exactly as-is.

**State management:**
- `expandedCard: KpiPreviewType | null` (useState, default null) - tracks which card is open
- `previewData: Record<KpiPreviewType, any[] | null>` (useState) - caches fetched data so re-clicking a previously opened card does not re-fetch
- `loading: boolean` (useState) - shows loading state during fetch

**Card click behavior:**
- Wrap each Card in a clickable div with `cursor-pointer` and `onClick` handler.
- On click: if same card is expanded, collapse it (`setExpandedCard(null)`). If different card, set `expandedCard` to the card's type. If data for that type is not cached, call the corresponding server action and cache the result.
- Add a subtle visual indicator to the expanded card: a bottom border highlight matching the card's `iconColor` (e.g., `border-b-2 border-red-400` for Leads Today).

**Card-to-action mapping:**
- "Leads Today" -> `fetchLeadsTodayPreview`, type: `'leads_today'`, viewAllHref: `/leads?date_from={today's date in yyyy-MM-dd}`
- "Assigned" -> `fetchAssignedPreview`, type: `'assigned'`, viewAllHref: `/leads?status=assigned`
- "Unassigned" -> `fetchUnassignedPreview`, type: `'unassigned'`, viewAllHref: `/unassigned`
- "Active Brokers" -> `fetchActiveBrokersPreview`, type: `'active_brokers'`, viewAllHref: `/brokers?status=active`
- "Active Orders" -> `fetchActiveOrdersPreview`, type: `'active_orders'`, viewAllHref: `/orders?status=active`

**Expanded panel (rendered below the grid of cards, outside the grid):**
- Use CSS transition for smooth expand/collapse: wrap in a div with `overflow-hidden transition-all duration-300 ease-in-out` and toggle `max-height: 0` vs `max-height: 500px` (or use grid-template-rows trick).
- Show a loading spinner (simple `animate-spin` Loader2 icon from lucide-react) centered while fetching.
- Once data arrives, render a compact table using the existing `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@/components/ui/table`.

**Table columns per card type:**

| Card | Columns |
|------|---------|
| Leads Today | Name, Phone, Vertical, Credit Score, Status, Time |
| Assigned | Name, Vertical, Credit Score, Broker, Assigned At |
| Unassigned | Name, Vertical, Credit Score, Reason, Received At |
| Active Brokers | Name, Company, Email, Status |
| Active Orders | Broker, Verticals, Delivered/Total, Remaining, Status |

- Format dates using `date-fns` `format(date, 'MMM d, h:mm a')` or similar short format.
- Format verticals arrays as comma-joined strings.
- Show a "View all ->" link (using Next.js `Link`) at the bottom-right of the panel, styled as `text-sm text-muted-foreground hover:text-foreground`. Use the `viewAllHref` from the mapping above. Use `format(new Date(), 'yyyy-MM-dd')` for the dynamic date in Leads Today href.

**Important:** The dashboard page (`src/app/(dashboard)/page.tsx`) passes `data` as a prop. Keep the `KpiCards` component signature as `{ data: KpiData }` so NO changes needed to the page. The component being `'use client'` is fine since `KpiData` is serializable.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit 2>&1 | head -20</automated>
    <manual>Visit localhost:3000, click each KPI card. Verify: (1) table slides open below cards, (2) clicking another card swaps the table, (3) clicking same card collapses, (4) "View all" links navigate correctly with filters.</manual>
  </verify>
  <done>KPI cards are clickable. Clicking expands an inline preview table below the card row. Only one expands at a time. Data is lazy-loaded via server actions. Each expanded section has a working "View all" link to the filtered page. No changes required to the dashboard page component.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- `bun run build` succeeds
- Clicking any KPI card shows a preview table below the card row
- Clicking a different card collapses the first and opens the new one
- Clicking the same card again collapses it
- Data is NOT fetched until a card is clicked (check Network tab)
- "View all" links navigate to the correct pages with correct filters
</verification>

<success_criteria>
All 5 KPI cards are clickable with lazy-loaded expandable preview tables. Accordion behavior (one-at-a-time) works. "View all" links route to correct filtered pages. No changes to dashboard page.tsx required.
</success_criteria>

<output>
After completion, create `.planning/quick/2-make-kpi-cards-clickable-with-inline-exp/2-SUMMARY.md`
</output>
