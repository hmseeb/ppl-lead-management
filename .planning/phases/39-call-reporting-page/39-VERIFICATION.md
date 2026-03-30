---
phase: 39-call-reporting-page
status: passed
verifier: orchestrator-inline
verified_at: 2026-03-30
---

# Phase 39: Call Reporting Page -- Verification

## Goal
Brokers can view their call activity on a dedicated /portal/calls page with KPI cards, an outcome trend chart, and a list of upcoming callbacks.

## Success Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Broker sees /portal/calls with KPI cards (total, transferred, callbacks, no answer, voicemail) with percentage indicators | PASS | `PortalCallKpiCards` renders 5 cards with `{percent}% of total` text; page imports and renders component |
| 2 | Stacked bar chart shows call outcome volume with daily/weekly bucketing | PASS | `PortalCallOutcomeChart` uses recharts `BarChart` with `stackId="outcome"` on 4 bars; `bucketType` prop drives daily/weekly |
| 3 | Upcoming callbacks lists pending callbacks with lead name and scheduled time | PASS | `UpcomingCallbacks` component renders lead name (first+last with fallback) and `format(scheduled_time, 'MMM d, h:mm a')` |
| 4 | Date range filter bar controls all data on the page | PASS | Page reads `searchParams` into `dateFilters`, passes to `fetchPortalCallKpis` and `fetchPortalCallOutcomeVolume`; `PortalDateFilters` component uses `nuqs` with `shallow: false` for server re-render |
| 5 | All components use client-facing design (not admin copy) | PASS | KPI cards: no `onClick`, no `cursor-pointer`, no `expandedCard` state, no glow effects; uses `bg-color-500/5` tints, `text-2xl` (not admin's 3xl), no hover:scale |

## Requirement Traceability

| ID | Description | Status | Evidence |
|----|-------------|--------|----------|
| CALL-01 | Broker views call counts on /portal/calls | PASS | Page exists at `src/app/portal/(protected)/calls/page.tsx` with `fetchPortalCallKpis` |
| CALL-02 | Percentage of total for each outcome | PASS | `call-kpi-cards.tsx` line 73: `Math.round((value / data.totalCalls) * 100)` |
| CALL-03 | Stacked bar chart with daily/weekly bucketing | PASS | `call-outcome-chart.tsx` renders stacked `BarChart`; `call-queries.ts` line 86: `totalDays > 30 ? 'weekly' : 'daily'` |
| CALL-04 | Upcoming callbacks with lead name + time | PASS | `upcoming-callbacks.tsx` renders `UpcomingCallbacks` with lead name join and `format(scheduled_time)` |
| CALL-05 | Date range filter with pill presets | PASS | Page imports `PortalDateFilters` component; presets defined in `portal-filters.ts` (Today, 7d, 30d, 90d) |
| CALL-06 | Custom date range picker | PASS | `PortalDateFilters` component has two `<Input type="date">` fields for custom range |

## Automated Checks

- TypeScript compilation: PASS (only pre-existing bun:test errors)
- All 3 query functions export and filter by broker_id: PASS
- Page uses requireBrokerSession auth guard: PASS
- No admin-style drill-down in portal KPI cards: PASS

## Self-Check: PASSED

All 6 requirements verified. All 5 success criteria met. Phase goal achieved.
