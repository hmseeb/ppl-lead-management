---
phase: quick-8
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/actions/leads.ts
  - src/components/leads/marketer-reassign-dialog.tsx
  - src/components/leads/leads-data-table.tsx
  - src/app/(dashboard)/leads/page.tsx
autonomous: true
requirements: [MR-01, MR-02, MR-03, MR-04, MR-05, MR-06, MR-07]

must_haves:
  truths:
    - "Marketer can reassign a lead from one of their brokers to another of their assigned brokers"
    - "Marketer cannot reassign leads to brokers outside their assignment"
    - "Marketer cannot reassign leads that don't belong to their brokers"
    - "Activity log records reassignment with marketer context (marketer_id, from_broker, to_broker)"
    - "Admin reassignment (bulk re-route through engine) still works unchanged"
  artifacts:
    - path: "src/lib/actions/leads.ts"
      provides: "marketerReassignLead server action"
      contains: "marketerReassignLead"
    - path: "src/components/leads/marketer-reassign-dialog.tsx"
      provides: "Marketer reassign dialog with broker picker"
      contains: "MarketerReassignDialog"
    - path: "src/components/leads/leads-data-table.tsx"
      provides: "Role-aware toolbar showing correct dialog per role"
      contains: "role"
    - path: "src/app/(dashboard)/leads/page.tsx"
      provides: "Passes role prop to LeadsDataTable"
      contains: "role={role}"
  key_links:
    - from: "src/components/leads/marketer-reassign-dialog.tsx"
      to: "src/lib/actions/leads.ts"
      via: "marketerReassignLead server action call"
      pattern: "marketerReassignLead"
    - from: "src/components/leads/leads-data-table.tsx"
      to: "src/components/leads/marketer-reassign-dialog.tsx"
      via: "conditional render when role=marketer"
      pattern: "role.*marketer"
    - from: "src/lib/actions/leads.ts"
      to: "marketer_brokers table"
      via: "validates lead and target broker belong to marketer"
      pattern: "marketer_brokers"
---

<objective>
Allow marketers to reassign leads between their assigned brokers via a target-broker picker dialog, with full server-side validation that both the source lead and target broker belong to the marketer's assignments.

Purpose: Marketers need to move leads between their brokers without admin intervention, but within strict permission boundaries.
Output: New server action, new dialog component, updated leads table with role-aware toolbar.
</objective>

<execution_context>
@/Users/haseeb/.claude/get-shit-done/workflows/execute-plan.md
@/Users/haseeb/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/actions/leads.ts (existing reassignLeads admin action - DO NOT MODIFY)
@src/lib/auth/role.ts (getRole, getMarketerBrokerIds, getMarketerId helpers)
@src/lib/auth/marketer-session.ts (marketer session structure)
@src/components/leads/leads-data-table.tsx (current data table with admin ReassignDialog)
@src/components/leads/reassign-dialog.tsx (existing admin dialog - DO NOT MODIFY)
@src/components/leads/leads-columns.tsx (LeadRow type, column definitions)
@src/components/unassigned/manual-assign-dialog.tsx (reference pattern for broker/order picker dialog)
@src/app/(dashboard)/leads/page.tsx (leads page server component)
@src/lib/queries/leads.ts (fetchLeads, fetchBrokersForFilter)
@src/lib/queries/unassigned.ts (fetchActiveBrokersWithOrders)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create marketerReassignLead server action with full validation</name>
  <files>src/lib/actions/leads.ts</files>
  <action>
Add a new exported server action `marketerReassignLead` to the BOTTOM of `src/lib/actions/leads.ts`. Do NOT modify the existing `manualAssignLead` or `reassignLeads` functions.

The action signature: `marketerReassignLead(leadIds: string[], targetBrokerId: string, targetOrderId: string)`

Implementation steps:
1. Import `getMarketerId` and `getMarketerBrokerIds` from `@/lib/auth/role`.
2. Call `getMarketerId()` to get the current marketer's ID. If null, return `{ error: 'Unauthorized' }`.
3. Call `getMarketerBrokerIds()` to get the list of broker IDs assigned to this marketer.
4. Validate `targetBrokerId` is in the marketer's broker list. If not, return `{ error: 'Target broker is not in your assignments' }`.
5. For each lead ID:
   a. Fetch the lead (`id, first_name, last_name, assigned_broker_id, assigned_order_id, status`).
   b. Validate `lead.assigned_broker_id` is in the marketer's broker list. If not, skip with error "Lead not assigned to your brokers".
   c. Validate `lead.assigned_broker_id !== targetBrokerId`. If same broker, skip with error "Lead already assigned to this broker".
   d. Store `originalBrokerId` and `originalOrderId`.
   e. Decrement the original order's `leads_delivered` and (if not bonus_mode) increment `leads_remaining`, same pattern as existing `reassignLeads`.
   f. Update the lead: set `assigned_broker_id = targetBrokerId`, `assigned_order_id = targetOrderId`, `assigned_at = new Date().toISOString()`, `status = 'assigned'`, `rejection_reason = null`.
   g. Increment the target order's `leads_delivered` and (if not bonus_mode) decrement `leads_remaining`, same pattern as `manualAssignLead`.
   h. Log to `activity_log` with `event_type: 'marketer_reassignment'`, include `broker_id: targetBrokerId`, `lead_id`, `order_id: targetOrderId`, and `details: { marketer_id, from_broker_id: originalBrokerId, from_order_id: originalOrderId, to_broker_id: targetBrokerId, to_order_id: targetOrderId }`.
   i. If target broker has `crm_webhook_url`, create a delivery record (same pattern as `manualAssignLead`).
6. Collect results per lead: `{ lead_id, status: 'reassigned' | 'error', error? }`.
7. `revalidatePath('/leads')`, `revalidatePath('/brokers')`, `revalidatePath('/orders')`.
8. Return `{ success: true, total, reassigned, failed, results }`.

Use `createAdminClient()` for all DB operations, same as existing actions.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Grep for marketerReassignLead in the file, confirm it exists and imports role helpers</manual>
  </verify>
  <done>
    - marketerReassignLead function exported from src/lib/actions/leads.ts
    - Validates marketer identity, broker membership, lead ownership
    - Adjusts order counts on both source and target
    - Logs activity with marketer context
    - Creates webhook delivery if target broker has CRM URL
    - TypeScript compiles without errors
    - Existing manualAssignLead and reassignLeads functions untouched
  </done>
</task>

<task type="auto">
  <name>Task 2: Create marketer reassign dialog and wire role-aware leads table</name>
  <files>
    src/components/leads/marketer-reassign-dialog.tsx
    src/components/leads/leads-data-table.tsx
    src/app/(dashboard)/leads/page.tsx
  </files>
  <action>
**File 1: Create `src/components/leads/marketer-reassign-dialog.tsx`**

New client component. Pattern reference: `manual-assign-dialog.tsx` for broker/order picker UX.

Props: `{ selectedLeadIds: string[], onComplete: () => void, brokersWithOrders: BrokerWithOrders[] }` where `BrokerWithOrders` is the same type used in manual-assign-dialog (import or re-declare: `{ id, first_name, last_name, company, orders: { id, verticals, leads_remaining, status, bonus_mode }[] }`).

UI structure:
- Trigger button: `<Button size="sm" variant="default">` with `ArrowRightLeft` icon from lucide-react, text "Reassign to Broker ({count})".
- Dialog with title "Reassign Leads to Broker".
- Description: "{count} lead(s) will be moved to the selected broker."
- Two Select dropdowns (same pattern as ManualAssignDialog):
  1. "Target Broker" - lists all brokers from `brokersWithOrders` prop. Show `first_name last_name (company)`.
  2. "Target Order" - appears after broker selected, shows that broker's active orders with format: `{id.slice(0,8)} - {verticals.join(', ')} ({leads_remaining} remaining) [BONUS if applicable]`.
- Footer: Cancel button, Submit button ("Reassign {count} Leads"), disabled while loading or no selections.
- On submit: call `marketerReassignLead(selectedLeadIds, targetBrokerId, targetOrderId)`.
- On success: toast with result counts, close dialog, call `onComplete()`, `router.refresh()`.
- On error: toast.error with the error message.

**File 2: Update `src/components/leads/leads-data-table.tsx`**

Add a `role` prop to `DataTableProps`: `role?: 'admin' | 'marketer'`.

In the selection toolbar (the `selectedLeadIds.length > 0` block):
- If `role === 'marketer'`: render `<MarketerReassignDialog>` instead of `<ReassignDialog>`, passing `brokersWithOrders` from table meta.
- If `role !== 'marketer'` (admin or undefined): render existing `<ReassignDialog>` as-is (backward compatible).

Import `MarketerReassignDialog` from `./marketer-reassign-dialog`.

**File 3: Update `src/app/(dashboard)/leads/page.tsx`**

Pass `role={role}` to `<LeadsDataTable>`. The `role` variable already exists in this component (line 22). Just add it as a prop:
```
<LeadsDataTable data={data as any} columns={leadsColumns as any} totalCount={count} brokersWithOrders={brokersWithOrders as any} role={role} />
```
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>
      1. Log in as admin, go to /leads, select leads, confirm existing "Reassign Selected" dialog appears unchanged.
      2. Log in as marketer, go to /leads, select leads, confirm "Reassign to Broker" dialog appears with broker picker limited to assigned brokers.
    </manual>
  </verify>
  <done>
    - MarketerReassignDialog component exists with broker/order picker
    - LeadsDataTable conditionally renders MarketerReassignDialog for marketers
    - LeadsDataTable still renders ReassignDialog for admins (no behavior change)
    - Leads page passes role to the data table
    - TypeScript compiles without errors
    - Admin flow completely unchanged
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors.
2. Admin leads page: select leads, see "Reassign Selected" button, dialog sends leads through routing engine (existing behavior, unchanged).
3. Marketer leads page: select leads, see "Reassign to Broker" button, dialog shows broker picker with only assigned brokers, order picker for selected broker. Submit calls marketerReassignLead.
4. Server action validates: marketer identity, lead belongs to marketer's broker, target broker in marketer's assignments.
5. Activity log entry created with event_type 'marketer_reassignment' and full marketer context in details.
6. Order counts adjusted on both source (decremented) and target (incremented).
</verification>

<success_criteria>
- Marketers can select leads and reassign them to a specific target broker+order from their assignments
- Leads not belonging to the marketer's brokers cannot be reassigned (server validation)
- Target brokers outside the marketer's assignments are rejected (server validation)
- Activity log captures marketer_id, from_broker, to_broker
- Admin reassignment flow is completely untouched
- Zero TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/8-allow-marketers-to-reassign-leads-betwee/8-SUMMARY.md`
</output>
