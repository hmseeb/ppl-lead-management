---
status: testing
phase: v4.0 (34-37)
source: 34-01-SUMMARY.md, 34-02-SUMMARY.md, 35-01-SUMMARY.md, 36-01-SUMMARY.md, 37-01-SUMMARY.md, 37-02-SUMMARY.md
started: 2026-03-25T20:00:00Z
updated: 2026-03-25T20:00:00Z
---

## Current Test

number: 1
name: Book a Callback via API
expected: |
  POST /api/callbacks with valid lead_id, broker_id, and scheduled_time returns 201 with callback data including id and status "pending"
awaiting: user response

## Tests

### 1. Book a Callback via API
expected: POST /api/callbacks with valid lead_id, broker_id, and scheduled_time returns 201 with callback data
result: [pending]

### 2. Callback Created Webhook Fires
expected: After booking a callback, the broker's crm_webhook_url receives a POST with type "callback_created" and full lead + broker payload
result: [pending]

### 3. Cancel a Callback via API
expected: DELETE /api/callbacks/[id] returns 200 and marks the callback as cancelled
result: [pending]

### 4. Callback Cancelled Webhook Fires
expected: After cancelling, the broker's crm_webhook_url receives a POST with type "callback_cancelled"
result: [pending]

### 5. Leads Lookup Returns Broker Availability
expected: GET /api/leads/lookup?phone=... for an assigned lead returns broker object with contact_hours, timezone, and weekend_pause fields
result: [pending]

### 6. Log a Call Outcome
expected: POST /api/call-logs with lead_id, broker_id, outcome ("transferred"), duration, retell_call_id returns 201
result: [pending]

### 7. Call Log Rejects Invalid Outcome
expected: POST /api/call-logs with outcome "invalid_value" returns 400 validation error
result: [pending]

### 8. Calls Page Exists in Sidebar
expected: Admin sidebar shows "Calls" nav item. Clicking it navigates to /calls page
result: [pending]

### 9. Call KPI Cards Display
expected: /calls page shows 5 KPI cards: Total Calls, Transferred, Callbacks Booked, No Answer, Voicemail with counts
result: [pending]

### 10. Broker Filter Scopes KPIs
expected: Selecting a broker from the dropdown updates all KPI card values to show only that broker's data
result: [pending]

### 11. Call Outcome Chart Renders
expected: Stacked bar chart shows call outcome distribution over time with color-coded bars per outcome type
result: [pending]

### 12. Upcoming Callbacks Table
expected: Table shows pending callbacks with lead name, broker name, scheduled time, and status
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0

## Gaps

[none yet]
