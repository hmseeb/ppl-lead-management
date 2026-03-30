---
status: testing
phase: v5.0-broker-portal-analytics
source: 38-01-SUMMARY.md, 39-01-SUMMARY.md, 39-02-SUMMARY.md, 40-01-SUMMARY.md, 41-01-SUMMARY.md, 41-02-SUMMARY.md, 42-01-SUMMARY.md
started: 2026-03-30T18:00:00Z
updated: 2026-03-30T18:00:00Z
---

## Current Test

number: 1
name: Portal Navigation Links
expected: |
  Portal header shows 7 nav links: Dashboard, Calls, Analytics, Leads, Orders, Billing, Settings.
  Calls and Analytics are new links between Dashboard and Leads.
awaiting: user response

## Tests

### 1. Portal Navigation Links
expected: Portal header shows 7 nav links: Dashboard, Calls, Analytics, Leads, Orders, Billing, Settings. Calls and Analytics are new links between Dashboard and Leads.
result: [pending]

### 2. Date Range Filter Bar on Dashboard
expected: Dashboard shows a pill-style date range filter bar with presets (Today, 7d, 30d, 90d) and a custom date picker. Default is 30d. Selecting a preset highlights it. URL updates with date params.
result: [pending]

### 3. Dashboard Enrichment Cards
expected: Between Active Orders and Spend/Delivery Health, a 3-column row shows: Next Callback card (violet tint if pending), Avg Credit Score card (color-coded by tier), and Call Summary card (total calls, transfer rate).
result: [pending]

### 4. Lead Volume Trend Chart on Dashboard
expected: A lead volume area chart appears below the enrichment row, showing leads received over the selected date range with appropriate bucketing (daily for short ranges, weekly for longer).
result: [pending]

### 5. Compact Lead Quality on Dashboard
expected: Two compact cards appear on the dashboard: Credit Score Tiers (badge layout with tier counts) and Vertical Mix (stacked progress bar with legend).
result: [pending]

### 6. Date Filter Affects Dashboard Cards
expected: Changing the date range filter updates the lead volume chart, call summary, avg credit score, and compact lead quality cards. Spend trend and active orders are unaffected by date filter.
result: [pending]

### 7. Calls Page KPI Cards
expected: /portal/calls shows 5 KPI cards: Total Calls, Transferred, Callbacks Booked, No Answer, Voicemail. Each shows a count and percentage of total. Cards are static (no click-to-expand).
result: [pending]

### 8. Calls Page Outcome Chart
expected: A stacked bar chart on /portal/calls shows call outcome volume over time. Daily bucketing for short ranges, weekly for longer. Color-coded by outcome type.
result: [pending]

### 9. Calls Page Upcoming Callbacks
expected: Below the chart, an upcoming callbacks section lists pending callbacks with lead name and scheduled time, sorted soonest first. Shows empty state if no callbacks.
result: [pending]

### 10. Calls Page Date Filter
expected: /portal/calls has its own date range filter bar. Changing it updates the KPI cards and outcome chart. URL params persist on refresh.
result: [pending]

### 11. Analytics Page Full Charts
expected: /portal/analytics shows full-size Credit Score Distribution histogram (bar chart with tier bars) and Vertical Mix chart (horizontal bars). Both are larger/more detailed than dashboard versions.
result: [pending]

### 12. Analytics Page Date Filter
expected: /portal/analytics has its own date range filter bar. Changing it updates both charts. URL params persist on refresh.
result: [pending]

### 13. Active Page Highlighting
expected: Navigating to /portal/calls highlights "Calls" in the nav. Navigating to /portal/analytics highlights "Analytics". Dashboard highlights on /portal.
result: [pending]

### 14. Empty States
expected: Charts and cards show clean empty states (centered icon + message) when no data exists for the selected date range. No broken layouts or "undefined" values.
result: [pending]

### 15. Card Hover Effects
expected: All cards across dashboard, calls, and analytics pages have consistent hover shadow transitions (subtle lift effect).
result: [pending]

## Summary

total: 15
passed: 0
issues: 0
pending: 15
skipped: 0

## Gaps

[none yet]
