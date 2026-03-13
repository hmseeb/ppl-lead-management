---
phase: 14-pre-flight-validation
plan: 02
type: summary
status: complete
started: 2026-03-13
completed: 2026-03-13
---

## What was done

### Task 1: Leads query + table columns
- Added `rejection_reason` to fetchLeads select
- Added `rejection_reason` to LeadRow type
- Added 'rejected' red styling to statusColors
- Status column shows rejection reason as muted text below badge

### Task 2: Lead detail + status filter
- Added prominent red rejection card at top of lead detail page
- Added 'Rejected' option to status filter dropdown

## Artifacts
- `src/lib/queries/leads.ts` — select includes rejection_reason
- `src/components/leads/leads-columns.tsx` — rejected badge + reason display
- `src/components/leads/lead-detail.tsx` — rejection reason card
- `src/components/leads/leads-filters.tsx` — rejected filter option
