---
phase: 20-chart-adaptation
plan: 01
status: complete
commit: feat(20-01): adapt lead volume chart to dashboard date filter
---

## What changed

### `src/lib/queries/dashboard.ts`
- Added `LeadVolumeResult` type: `{ data: ChartData[], bucketType: 'daily' | 'weekly', totalDays: number }`
- `fetchLeadVolume` now determines bucketing strategy based on total days in the filter range:
  - **<= 30 days**: daily buckets (unchanged behavior, short day names for <=7d, "MMM d" for longer)
  - **> 30 days**: weekly buckets (7-day chunks, ~13 bars for 90d instead of 90)
- Added `addDays` and `min` imports from date-fns for weekly bucket calculation
- Return shape changed from flat array to `{ data, bucketType, totalDays }` object

### `src/components/dashboard/lead-volume-chart.tsx`
- Added `getChartTitle()` helper that returns dynamic title based on `totalDays` and `bucketType`
- Component now accepts optional `bucketType` and `totalDays` props (defaults maintain backward compat)
- Title examples: "Lead Volume (Today)", "Lead Volume (7 Days)", "Lead Volume (90 Days, Weekly)"

### `src/app/(dashboard)/page.tsx`
- Updated `LeadVolumeChart` invocation to destructure `volume.data`, `volume.bucketType`, `volume.totalDays`

## Verification
- `npx tsc --noEmit` passes (only pre-existing bun:test import errors)
- All three success criteria met:
  1. "7d" filter -> 7 daily bars
  2. "90d" filter -> ~13 weekly bars with ", Weekly" suffix in title
  3. "today" or short custom range -> daily bars for that range

## Performance note
90d range now makes ~13 queries instead of 90. still sequential (not parallel), but acceptable for a dashboard that caches via Next.js.
