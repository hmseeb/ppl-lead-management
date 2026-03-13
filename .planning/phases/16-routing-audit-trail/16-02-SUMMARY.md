## 16-02 Summary: Routing Audit UI on Lead Detail Page

**Status:** Complete
**Date:** 2026-03-13

### What was done

1. **fetchLeadDetail updated** — Added parallel query for routing_logs with order/broker joins. Returns routingLogs array alongside existing deliveries and activityLog.

2. **Lead detail page wired** — page.tsx passes routingLogs prop to LeadDetail component.

3. **Routing Audit card** — New card on lead detail page between Assignment and Delivery Status:
   - Shows count of orders evaluated
   - Table with columns: Order (ID + broker name), Status (Selected/Eligible/Disqualified badges), Reason, Credit Fit, Capacity (with fill % annotation), Tier Match, Loan Fit, Bonuses, Total
   - Selected row: green background, bold total
   - Disqualified rows: red background, "-" for score columns
   - Empty state: card hidden when no routing logs exist

### Artifacts

| File | Change |
|------|--------|
| src/lib/queries/leads.ts | Added routing_logs query to fetchLeadDetail |
| src/app/(dashboard)/leads/[id]/page.tsx | Passes routingLogs prop |
| src/components/leads/lead-detail.tsx | Routing Audit card with score breakdown table |

### Requirements covered

- AUDIT-03: Routing log viewable on lead detail page showing all orders scored with breakdown
