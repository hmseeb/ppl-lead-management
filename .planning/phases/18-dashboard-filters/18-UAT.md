---
status: testing
phase: 18-21 (v2.1 Dashboard Analytics)
source: 18-01-SUMMARY.md, 18-02-SUMMARY.md, 19-01-SUMMARY.md, 20-01-SUMMARY.md, 21-01-SUMMARY.md
started: 2026-03-17T14:00:00+05:00
updated: 2026-03-17T14:00:00+05:00
---

## Current Test

number: 1
name: Date Preset Buttons
expected: |
  Dashboard shows preset buttons (Today, 7 Days, 30 Days, 90 Days). Clicking "7 Days" updates all KPI cards and delivery stats to show data from the last 7 days. "Today" is selected by default.
awaiting: user response

## Tests

### 1. Date Preset Buttons
expected: Dashboard shows preset buttons (Today, 7 Days, 30 Days, 90 Days). Clicking "7 Days" updates all KPI cards and delivery stats to show data from the last 7 days. "Today" is selected by default.
result: [pending]

### 2. Custom Date Range
expected: Setting custom date_from and date_to via date pickers scopes all dashboard data to that exact range. Selecting custom dates clears any active preset.
result: [pending]

### 3. Broker Filter
expected: Dropdown shows all brokers by name. Selecting a broker updates all KPIs to show only that broker's numbers (leads assigned to them, their deliveries, etc.).
result: [pending]

### 4. Vertical Filter
expected: Dropdown shows verticals (MCA, SBA, Equipment Finance, Working Capital, Lines of Credit). Selecting one scopes all KPIs to leads of that vertical only.
result: [pending]

### 5. URL Persistence
expected: After selecting filters, the URL updates with query params (e.g. ?date_preset=7d&broker_id=xxx). Copying and opening that URL in a new tab shows the same filtered dashboard.
result: [pending]

### 6. Clear All
expected: "Clear" button appears when any filter is active. Clicking it resets everything to defaults (Today, no broker, no vertical, compare off).
result: [pending]

### 7. Compare Toggle
expected: Clicking "Compare" button activates comparison mode. Delta badges appear on each KPI card showing the change vs the previous period (e.g. +25% or -3pp).
result: [pending]

### 8. Delta Badge Colors
expected: Delta badges are contextually colored: green when good metrics go up (leads, assigned) or bad metrics go down (failures, rejected). Red for the opposite.
result: [pending]

### 9. Chart Range Adaptation
expected: Selecting "7 Days" shows 7 daily bars in the lead volume chart. Selecting "90 Days" switches to weekly buckets (~13 bars). Chart title updates dynamically.
result: [pending]

### 10. Auto-Reassignment on Order Activation
expected: When an order is activated or unpaused, unassigned leads matching that order's criteria are automatically scored and assigned. Each auto-reassignment appears in the activity log.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
