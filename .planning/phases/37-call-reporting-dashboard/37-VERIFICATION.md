---
status: passed
phase: 37
name: Call Reporting Dashboard
verified: 2026-03-25
requirements: [RPT-01, RPT-02, RPT-03, RPT-04]
---

# Phase 37: Call Reporting Dashboard - Verification

## Phase Goal
Admin can see a complete picture of call activity and upcoming callbacks from a dedicated reporting page.

## Success Criteria Verification

### 1. Call reporting page with KPI cards
**Status: PASSED**
- `/calls` page exists at `src/app/(dashboard)/calls/page.tsx`
- 5 KPI cards rendered via `CallKpiCards` component: total calls, transferred, callbacks booked, no answer, voicemail
- Each card shows count and percentage of total
- Server-side data fetching via `fetchCallKpis`

### 2. Call outcome chart with date range filtering
**Status: PASSED**
- `CallOutcomeChart` component renders stacked bar chart with 4 outcome types
- Uses recharts BarChart with stacked bars (transferred, callback_booked, no_answer, voicemail)
- Date range adaptation: daily buckets for <= 30 days, weekly for > 30 days
- `fetchCallOutcomeVolume` uses efficient single-query + TypeScript bucketing

### 3. Broker filter scoping all KPIs and charts
**Status: PASSED**
- `CallReportingFilters` component includes broker dropdown via nuqs with `shallow: false`
- `fetchCallKpis` applies `broker_id` filter to all count queries
- `fetchCallOutcomeVolume` applies `broker_id` filter to outcome data
- Date preset buttons (Today, 7d, 30d, 90d) and custom date range inputs

### 4. Upcoming callbacks section
**Status: PASSED**
- `UpcomingCallbacks` component renders table with 4 columns: Lead, Broker, Scheduled Time, Status
- `fetchUpcomingCallbacks` queries callbacks table with lead/broker joins
- Filtered to `status = 'pending'` and `scheduled_time >= now()`
- Sorted by soonest scheduled time, limited to 20 rows

## Requirements Traceability

| Requirement | Status | Evidence |
|-------------|--------|----------|
| RPT-01 | Complete | KPI cards in `call-kpi-cards.tsx`, query in `call-reporting.ts` |
| RPT-02 | Complete | Stacked bar chart in `call-outcome-chart.tsx`, volume query in `call-reporting.ts` |
| RPT-03 | Complete | Broker dropdown in `call-reporting-filters.tsx`, broker_id filtering in queries |
| RPT-04 | Complete | Callbacks table in `upcoming-callbacks.tsx`, callbacks query in `call-reporting.ts` |

## Code Quality

- TypeScript compiles with zero new errors (`npx tsc --noEmit`)
- 6 atomic commits (2 per plan + 2 metadata)
- All files follow existing project patterns (server components, nuqs, shadcn, createAdminClient)
- Sidebar navigation updated with "Calls" link

## Verification Result

**Score: 4/4 must-haves verified**
**Status: PASSED**
