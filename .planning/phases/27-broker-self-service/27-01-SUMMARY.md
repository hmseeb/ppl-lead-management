---
phase: 27-broker-self-service
plan: 01
subsystem: portal
tags: [portal, self-service, orders, settings, delivery-prefs, contact-hours]

requires:
  - phase: 22-broker-auth
    provides: broker session, guard, portal layout
  - phase: 23-data-isolation
    provides: broker-scoped queries
  - phase: 26-portal-dashboard
    provides: dashboard cards, portal header

provides:
  - broker orders page with pause/resume controls
  - broker settings page with delivery preferences + contact hours
  - portal navigation with Dashboard, Leads, Orders, Billing, Settings
  - broker-scoped server actions for order management and settings

affects: [portal-orders, portal-settings, portal-header, portal-queries, portal-actions]

key-files:
  modified:
    - src/components/portal/portal-header.tsx
    - src/lib/portal/queries.ts
  created:
    - src/app/portal/(protected)/orders/page.tsx
    - src/app/portal/(protected)/settings/page.tsx
    - src/components/portal/orders-list.tsx
    - src/components/portal/settings-form.tsx
    - src/lib/actions/portal-self-service.ts
    - .planning/phases/27-broker-self-service/27-01-PLAN.md

key-decisions:
  - "Broker can only pause/resume orders, never cancel or delete (SELF-04)"
  - "Server actions validate session + ownership before every mutation"
  - "Settings form uses toggle-style delivery method buttons with visual feedback"
  - "Weekend pause uses custom toggle switch (no third-party switch component)"
  - "Activity log entries include source: broker_portal for audit trail"
  - "Order resume triggers auto-reassignment of unassigned leads"

requirements-completed: [SELF-01, SELF-02, SELF-03, SELF-04]

duration: 10min
completed: 2026-03-17
---

# Plan 27-01: Broker Self-Service Summary

**Brokers can now manage orders (pause/resume) and delivery settings without admin intervention.**

## Performance

- **Duration:** 10 min
- **Tasks:** 6
- **Files created:** 5
- **Files modified:** 2

## Accomplishments

### SELF-01: Order Pause/Resume
- `brokerPauseOrder(orderId)` validates session + ownership, only allows pausing active orders
- `brokerResumeOrder(orderId)` validates session + ownership, only allows resuming paused orders
- OrdersList client component shows all orders with status badges and pause/resume buttons
- Activity log tracks changes with `source: broker_portal` for audit
- Resuming an order triggers auto-reassignment of unassigned leads

### SELF-02: Delivery Method Preferences
- Settings form with toggle-style buttons for webhook, email, and SMS
- Conditional fields: webhook URL input shown only when webhook selected, email/phone shown for their respective methods
- Zod validation ensures at least one delivery method is selected
- Updates broker record directly via `updateBrokerSettings()` server action

### SELF-03: Contact Hours and Timezone
- Timezone dropdown with all US timezones and human-readable labels
- Contact hours selector: Anytime, Business Hours, Custom
- Custom hours mode shows start/end time inputs (HTML time picker)
- Weekend pause toggle switch
- All settings persist to broker record

### SELF-04: No Cancel/Delete Controls
- Orders page only shows Pause button for active orders and Resume button for paused orders
- No cancel, delete, or modify controls exist in the portal UI
- Completed orders show no action buttons at all

## Task Commits

1. **All tasks** - `23cfe91` (feat)
2. **Header fix** - `4af1351` (fix)

## Files Created/Modified
- `src/lib/actions/portal-self-service.ts` - Server actions: brokerPauseOrder, brokerResumeOrder, updateBrokerSettings
- `src/lib/portal/queries.ts` - Added getPortalBrokerSettings query
- `src/app/portal/(protected)/orders/page.tsx` - Orders list page (server component)
- `src/components/portal/orders-list.tsx` - Orders list with pause/resume buttons (client component)
- `src/app/portal/(protected)/settings/page.tsx` - Settings page (server component)
- `src/components/portal/settings-form.tsx` - Settings form with delivery prefs + contact hours (client component)
- `src/components/portal/portal-header.tsx` - Added navigation links (Dashboard, Leads, Orders, Billing, Settings)

## Deviations from Plan
- Phases 28 (lead visibility) and 29 (billing) were auto-generated and committed alongside phase 27 by the tooling

## Issues Encountered
- Linter auto-generated phases 28 and 29 alongside phase 27 changes, resulting in a combined commit
- TypeScript error with error type narrowing in settings form, fixed by removing redundant string check

---
*Phase: 27-broker-self-service*
*Completed: 2026-03-17*
