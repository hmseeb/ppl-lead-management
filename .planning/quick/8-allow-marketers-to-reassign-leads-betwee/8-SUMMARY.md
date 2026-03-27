---
phase: quick-8
plan: 1
subsystem: ui, api
tags: [next.js, server-actions, supabase, role-based-access, marketer]

requires:
  - phase: quick-7
    provides: marketer role system with auth, broker assignments, role helpers

provides:
  - marketerReassignLead server action with full validation
  - MarketerReassignDialog component with broker/order picker
  - Role-aware leads data table toolbar

affects: [leads, marketer-dashboard, activity-log]

tech-stack:
  added: []
  patterns: [role-conditional toolbar rendering, marketer-scoped server action validation]

key-files:
  created:
    - src/components/leads/marketer-reassign-dialog.tsx
  modified:
    - src/lib/actions/leads.ts
    - src/components/leads/leads-data-table.tsx
    - src/app/(dashboard)/leads/page.tsx

key-decisions:
  - "Marketer reassignment targets a specific broker+order (not routing engine) for precise control"
  - "Activity log uses distinct event_type 'marketer_reassignment' to distinguish from admin reassignments"

patterns-established:
  - "Role-conditional toolbar: leads-data-table renders different action dialogs based on role prop"
  - "Marketer-scoped validation: server actions validate both marketer identity and broker membership"

requirements-completed: [MR-01, MR-02, MR-03, MR-04, MR-05, MR-06, MR-07]

duration: 3min
completed: 2026-03-27
---

# Quick Task 8: Allow Marketers to Reassign Leads Between Brokers Summary

**Marketer lead reassignment with broker/order picker dialog and server-side validation of broker membership**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T11:02:42Z
- **Completed:** 2026-03-27T11:05:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Server action validates marketer identity, broker membership, and lead ownership before any mutation
- Broker/order picker dialog follows existing ManualAssignDialog UX pattern for consistency
- Role-aware toolbar shows correct dialog per role with zero admin behavior change

## Task Commits

Each task was committed atomically:

1. **Task 1: Create marketerReassignLead server action** - `1d7183c` (feat)
2. **Task 2: Create marketer reassign dialog and wire role-aware leads table** - `dbf3659` (feat)

## Files Created/Modified
- `src/lib/actions/leads.ts` - Added marketerReassignLead server action with full validation, order count adjustment, activity logging, and webhook delivery
- `src/components/leads/marketer-reassign-dialog.tsx` - New client component with broker/order picker, same UX pattern as ManualAssignDialog
- `src/components/leads/leads-data-table.tsx` - Added role prop, conditional rendering of MarketerReassignDialog vs ReassignDialog
- `src/app/(dashboard)/leads/page.tsx` - Passes role prop to LeadsDataTable

## Decisions Made
- Marketer reassignment targets a specific broker+order rather than going through the routing engine, giving marketers precise control over where leads go
- Used distinct event_type 'marketer_reassignment' in activity log to clearly distinguish from admin bulk reassignments

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Marketer role system now has full CRUD: view leads, reassign between assigned brokers
- Activity log captures marketer context for audit trail
- Admin flows completely untouched

## Self-Check: PASSED

- All 4 files exist on disk
- Both task commits verified: `1d7183c`, `dbf3659`
- TypeScript compiles with zero new errors

---
*Quick Task: 8*
*Completed: 2026-03-27*
