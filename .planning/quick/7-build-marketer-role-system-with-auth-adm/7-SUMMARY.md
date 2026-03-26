---
phase: quick-7
plan: 01
subsystem: auth, dashboard
tags: [marketer, role-based-access, magic-link, iron-session, crud]
dependency_graph:
  requires: [broker-session, admin-session, supabase-auth]
  provides: [marketer-auth, marketer-role-filtering, marketer-management]
  affects: [middleware, sidebar, all-dashboard-pages, all-query-functions]
tech_stack:
  added: [marketer-session-cookie]
  patterns: [role-based-query-filtering, dual-session-middleware]
key_files:
  created:
    - supabase/migrations/20260326_marketers.sql
    - src/lib/auth/marketer-session.ts
    - src/lib/auth/role.ts
    - src/lib/actions/marketer-magic-link.ts
    - src/app/marketer/login/page.tsx
    - src/app/marketer/auth/callback/page.tsx
    - src/app/marketer/auth/callback/actions.ts
    - src/app/marketer/layout.tsx
    - src/lib/queries/marketers.ts
    - src/lib/actions/marketers.ts
    - src/app/(dashboard)/marketers/page.tsx
    - src/components/marketers/marketers-table.tsx
    - src/components/marketers/marketer-form.tsx
    - src/components/marketers/marketer-broker-assign.tsx
  modified:
    - src/lib/types/database.ts
    - src/middleware.ts
    - src/lib/auth/actions.ts
    - src/components/layout/sidebar.tsx
    - src/app/(dashboard)/layout.tsx
    - src/lib/queries/dashboard.ts
    - src/lib/queries/leads.ts
    - src/lib/queries/brokers.ts
    - src/lib/queries/orders.ts
    - src/lib/queries/unassigned.ts
    - src/lib/queries/activity.ts
    - src/lib/queries/call-reporting.ts
    - src/app/(dashboard)/page.tsx
    - src/app/(dashboard)/leads/page.tsx
    - src/app/(dashboard)/brokers/page.tsx
    - src/app/(dashboard)/brokers/[id]/page.tsx
    - src/app/(dashboard)/orders/page.tsx
    - src/app/(dashboard)/unassigned/page.tsx
    - src/app/(dashboard)/activity/page.tsx
    - src/app/(dashboard)/calls/page.tsx
decisions:
  - Marketer auth follows broker pattern: Supabase Auth OTP + iron-session cookie
  - Role detection checks admin session first, marketer session second
  - broker_ids filtering added as optional param to all query functions (no breaking changes)
  - Marketer sees ALL unassigned leads but can only assign to their brokers
  - Broker assignment uses full-replace pattern (delete all + insert new)
metrics:
  duration: 640s
  completed: 2026-03-26
  tasks: 3
  files_created: 14
  files_modified: 20
---

# Quick Task 7: Build Marketer Role System Summary

Marketer role with magic link auth, role-filtered dashboard across all 8 pages, and admin CRUD at /marketers with broker assignment UI.

## What Was Built

### Task 1: Database, Auth, Role Detection, Middleware (862e68c)

**Database schema:** Created `marketers` table (id, email, first_name, last_name, phone, status) and `marketer_brokers` junction table (marketer_id, broker_id) with indexes.

**Marketer session:** Iron-session with `ppl-marketer-session` cookie, following the exact broker-session pattern.

**Role detection:** `getRole()` returns `'admin'` or `'marketer'` by checking which session is active. `getMarketerBrokerIds()` queries the junction table for the current marketer's broker IDs.

**Magic link flow:** `/marketer/login` sends OTP via Supabase Auth. Callback at `/marketer/auth/callback` exchanges token, creates iron-session, redirects to dashboard.

**Middleware:** Now checks both `ppl-session` (admin) and `ppl-marketer-session` (marketer) before redirecting to `/login`. Matcher excludes `/marketer/*` paths.

### Task 2: Role-Aware Sidebar + Data Filtering (cacd293)

**Sidebar:** Accepts `role` and `logoutAction` props. Filters nav items by role (hides Settings + Marketers for marketer). Shows "Marketer View" subtitle. New Marketers nav item with UserCog icon for admin.

**Query functions:** All 7 query modules updated with optional `brokerIds` parameter:
- `dashboard.ts`: fetchKpis, fetchLeadVolume, fetchDeliveryStats, fetchRecentActivity, fetchRevenueSummary
- `leads.ts`: fetchLeads (via broker_ids filter), fetchBrokersForFilter
- `brokers.ts`: fetchBrokersWithStats
- `orders.ts`: fetchOrdersWithBroker
- `unassigned.ts`: fetchActiveBrokersWithOrders (broker dropdown only)
- `activity.ts`: fetchActivityLog, fetchBrokersForActivityFilter
- `call-reporting.ts`: fetchCallKpis, fetchCallOutcomeVolume

**Pages:** All 8 dashboard pages detect role, fetch brokerIds when marketer, pass to query functions. Conditional rendering: hide "New Broker"/"New Order" buttons, hide BrokerQuickActions, block non-assigned broker detail access.

### Task 3: Admin /marketers CRUD Page (5c68840)

**Queries:** fetchMarketers (paginated, searchable, with broker_count), fetchMarketerDetail, fetchAllBrokersForAssignment.

**Actions:** createMarketer, updateMarketer, deleteMarketer (cascade), assignBrokersToMarketer (full-replace pattern).

**UI:** MarketersTable with inline Edit/Delete/Manage Brokers dialogs. MarketerForm for create/edit. MarketerBrokerAssign with searchable checkbox list.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: passes (only pre-existing bun:test errors)
- `bun run build`: passes, all routes render correctly
- All new routes present: /marketer/login, /marketer/auth/callback, /marketers
- Existing admin and broker portal routes unchanged

## Self-Check: PASSED

All 14 created files verified. All 3 task commits verified (862e68c, cacd293, 5c68840).
