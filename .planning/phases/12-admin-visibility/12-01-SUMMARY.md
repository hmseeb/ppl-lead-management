---
phase: 12-admin-visibility
plan: 01
subsystem: ui
tags: [dashboard, kpi, broker-detail, queued-deliveries, contact-hours]

# Dependency graph
requires:
  - phase: 10-hours-aware-delivery
    provides: contact_hours, custom_hours_start/end, weekend_pause, timezone fields on brokers
  - phase: 11-queue-processing
    provides: queued delivery status and queue processing
provides:
  - Queued KPI card on overview dashboard with click-to-expand preview
  - Contact Hours card on broker detail page
  - Per-broker queued deliveries table on broker detail page
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [kpi-card-with-preview, conditional-card-rendering]

key-files:
  created: []
  modified:
    - src/lib/queries/dashboard.ts
    - src/lib/actions/dashboard.ts
    - src/components/dashboard/kpi-cards.tsx
    - src/lib/queries/brokers.ts
    - src/components/brokers/broker-detail.tsx
    - src/app/(dashboard)/brokers/[id]/page.tsx

key-decisions:
  - "Queued KPI card placed after Unassigned, before Active Brokers in 6-column grid"
  - "Contact Hours card placed between Profile and Orders on broker detail"
  - "Queued deliveries table only shown when count > 0 to avoid empty state"

patterns-established:
  - "Conditional card rendering: only show section when data exists (queuedDeliveries.length > 0)"

requirements-completed: [VIS-01, VIS-02]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 12 Plan 01: Admin Visibility Summary

**Queued delivery KPI card on dashboard with click-to-expand preview, plus broker contact hours and queued deliveries sections on broker detail page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T11:30:02Z
- **Completed:** 2026-03-13T11:32:32Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Dashboard overview now shows 6 KPI cards including "Queued" with orange styling and count of deliveries with status='queued'
- Queued card click-to-expand shows preview table with lead name, broker name, channel, and queued time
- Broker detail page displays Contact Hours card with schedule type, custom window, weekend pause, and timezone
- Broker detail page conditionally shows Queued Deliveries table for brokers with pending queue items

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Queued KPI card to overview dashboard** - `4a45348` (feat)
2. **Task 2: Add hours info and queued deliveries to broker detail page** - `95dcde4` (feat)

## Files Created/Modified
- `src/lib/queries/dashboard.ts` - Added queued count query to fetchKpis
- `src/lib/actions/dashboard.ts` - Added 'queued' to KpiPreviewType, added fetchQueuedPreview server action
- `src/components/dashboard/kpi-cards.tsx` - Added Queued card config, 6-column grid, queued preview table case
- `src/lib/queries/brokers.ts` - Added queued deliveries parallel query to fetchBrokerDetail
- `src/components/brokers/broker-detail.tsx` - Added Contact Hours card and Queued Deliveries table
- `src/app/(dashboard)/brokers/[id]/page.tsx` - Passed queuedDeliveries prop to BrokerDetail

## Decisions Made
- Queued KPI card placed after Unassigned, before Active Brokers (logical grouping: problem indicators together)
- Contact Hours card placed between Profile and Orders on broker detail (configuration before transactional data)
- Queued deliveries table only rendered when count > 0 to keep clean broker pages for brokers without queue

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admin has full visibility into queued deliveries system-wide and per-broker
- Contact hours configuration visible for operational verification
- Ready for any remaining admin visibility features in 12-02

## Self-Check: PASSED

- All 6 modified files verified on disk
- Commits 4a45348 and 95dcde4 verified in git log

---
*Phase: 12-admin-visibility*
*Completed: 2026-03-13*
