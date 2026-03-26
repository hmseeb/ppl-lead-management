---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/calls/upcoming-callbacks.tsx
  - src/app/(dashboard)/calls/page.tsx
autonomous: true
requirements: [QUICK-5]
must_haves:
  truths:
    - "Admin sees callbacks grouped by day with date headers (Today, Tomorrow, or formatted date)"
    - "Admin can pick a date range to browse callbacks for specific days"
    - "Default view shows today + next 7 days of callbacks"
    - "Existing table format (Lead, Broker, Scheduled Time, Status) preserved within each day group"
    - "Query fetches all callbacks for selected date range, not limited to 20"
  artifacts:
    - path: "src/components/calls/upcoming-callbacks.tsx"
      provides: "Client component with date picker, date-grouped callback tables, API fetching"
      contains: "'use client'"
  key_links:
    - from: "src/components/calls/upcoming-callbacks.tsx"
      to: "/api/callbacks"
      via: "fetch with from/to/status params"
      pattern: "fetch.*api/callbacks"
---

<objective>
Enhance the upcoming callbacks section on /calls page with date range browsing and day-grouped display.

Purpose: Let admins browse callbacks by day instead of seeing a flat list of 20. Group by date with relative labels (Today, Tomorrow) for quick scanning.
Output: Self-contained client component that fetches from existing GET /api/callbacks endpoint with date range params.
</objective>

<execution_context>
@/Users/haseeb/.claude/get-shit-done/workflows/execute-plan.md
@/Users/haseeb/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/calls/upcoming-callbacks.tsx (current server component, will be rewritten)
@src/app/api/callbacks/route.ts (existing GET endpoint with from/to/status filters)
@src/app/(dashboard)/calls/page.tsx (parent page, needs minor update)
@src/components/calls/call-reporting-filters.tsx (reference for native date input pattern)
@src/lib/queries/call-reporting.ts (fetchUpcomingCallbacks will no longer be called from page)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite upcoming-callbacks as client component with date range and day grouping</name>
  <files>src/components/calls/upcoming-callbacks.tsx</files>
  <action>
Rewrite `upcoming-callbacks.tsx` as a `'use client'` component that manages its own state and data fetching. No props needed anymore since it fetches its own data.

**State management:**
- `dateFrom` / `dateTo` state (strings, "YYYY-MM-DD" format)
- `callbacks` state (array from API response)
- `loading` state (boolean)
- Default: dateFrom = today (format with date-fns `format(new Date(), 'yyyy-MM-dd')`), dateTo = today + 7 days

**Date picker UI (in CardHeader, right side):**
- Two native `<Input type="date">` elements (same pattern as call-reporting-filters.tsx)
- Labeled "From" and "To" with small text
- A "Reset" button (ghost, small) that resets to default range
- Use flex layout: title on left, date inputs on right

**Data fetching:**
- `useEffect` that fires when dateFrom or dateTo changes
- Fetch from `/api/callbacks?status=pending&from={startOfDay(dateFrom).toISOString()}&to={endOfDay(dateTo).toISOString()}&limit=100`
- Use `startOfDay` and `endOfDay` from date-fns to ensure full day coverage
- Set loading true before fetch, false after
- Parse response as `{ data: CallbackRow[] }` where CallbackRow has: id, scheduled_time, status, lead_name, broker_name

**Day grouping logic:**
- After fetching, group callbacks by date key: `format(new Date(cb.scheduled_time), 'yyyy-MM-dd')`
- Use `Object.entries(grouped)` sorted by date key ascending
- For each group, render a day header then the table rows

**Day header labels:**
- Compare date key to today: if same day, show "Today, Mar 26"
- If tomorrow, show "Tomorrow, Mar 27"
- Otherwise show full: "Friday, Mar 28" (use `format(date, 'EEEE, MMM d')`)
- Style: text-sm font-medium text-foreground, with a subtle bottom border, mb-2 mt-4 (first group mt-0)

**Table per group:**
- Reuse existing Table/TableHeader/TableBody/TableRow/TableCell/TableHead components
- Same columns: Lead, Broker, Scheduled Time (show just time: "h:mm a"), Status
- Status badge: capitalize, amber-500 for pending (same as current)

**Empty state:**
- If no callbacks after fetch, show "No upcoming callbacks in this range"

**Loading state:**
- Show a simple "Loading..." text centered in the card while fetching

**Important:** The API response uses `lead_name` and `broker_name` (strings), not nested objects. The scheduled_time format for display within a day group should only show the time (e.g., "2:30 PM") since the date is already in the header.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit src/components/calls/upcoming-callbacks.tsx 2>&1 | head -20</automated>
    <manual>Visit /calls page, verify callbacks section shows date picker inputs, day headers, and grouped callbacks</manual>
  </verify>
  <done>Component renders with date range inputs defaulting to today+7 days, fetches from /api/callbacks, groups results by day with relative date headers (Today/Tomorrow/weekday), shows time-only in table rows within each group</done>
</task>

<task type="auto">
  <name>Task 2: Update calls page to use new prop-less UpcomingCallbacks</name>
  <files>src/app/(dashboard)/calls/page.tsx, src/lib/queries/call-reporting.ts</files>
  <action>
**In `src/app/(dashboard)/calls/page.tsx`:**
- Remove `fetchUpcomingCallbacks` from the import
- Remove `callbacks` from the Promise.all destructuring (change to `[kpis, volume, _, brokers]` or just remove it entirely and adjust)
- Update the Promise.all to only call: `fetchCallKpis(filters)`, `fetchCallOutcomeVolume(filters)`, `fetchBrokersForFilter()`
- Remove the `callbacks={callbacks}` prop from `<UpcomingCallbacks />`
- The component now takes no props: `<UpcomingCallbacks />`

**In `src/lib/queries/call-reporting.ts`:**
- Keep `fetchUpcomingCallbacks` function as-is (it may be used elsewhere or useful later). Do NOT delete it.
- Keep the `UpcomingCallback` type export as-is.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit src/app/\(dashboard\)/calls/page.tsx 2>&1 | head -20</automated>
    <manual>Visit /calls, confirm page loads without errors, callbacks section renders independently</manual>
  </verify>
  <done>Calls page no longer fetches callbacks server-side. UpcomingCallbacks component is self-contained, fetching its own data client-side. Page compiles without type errors.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors on both modified files
- `/calls` page loads without console errors
- Upcoming callbacks section shows two date inputs defaulting to today through today+7
- Callbacks are grouped under day headers with relative labels
- Changing dates re-fetches and re-groups callbacks
</verification>

<success_criteria>
- Date picker allows browsing callbacks by custom date range
- Default range is today + 7 days
- Callbacks grouped by day with "Today", "Tomorrow", or weekday+date headers
- Existing table format preserved within each group
- Time column shows time only (not full date) since day is in header
- No server-side callback fetching on initial page load (component is self-contained)
</success_criteria>

<output>
After completion, create `.planning/quick/5-enhance-upcoming-callbacks-with-day-grou/5-SUMMARY.md`
</output>
