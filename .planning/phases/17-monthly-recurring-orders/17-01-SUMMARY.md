## 17-01 Summary: Monthly Reset SQL Function + pg_cron + Activity Log UI

**Status:** Complete
**Date:** 2026-03-13

### What was done

1. **Migration 00023_monthly_reset.sql** — Created `reset_monthly_orders()` function that loops over monthly orders with `leads_delivered > 0`, resets counts, reactivates completed orders, and logs each reset to activity_log. Scheduled via pg_cron at midnight UTC on the 1st (`0 0 1 * *`).

2. **Types regenerated** — database.ts updated from live schema.

3. **Activity log UI** — Added `monthly_reset` event color (cyan) and icon (RefreshCw) to activity-log-table.tsx. Existing `Object.entries(details)` rendering handles the new jsonb fields automatically.

### Artifacts

| File | Change |
|------|--------|
| supabase/migrations/00023_monthly_reset.sql | New migration |
| src/lib/types/database.ts | Regenerated |
| src/components/activity/activity-log-table.tsx | Added monthly_reset color + icon |

### Requirements covered

- ORDER-03: Monthly orders auto-reset leads_delivered on the 1st
- AUDIT-04: Monthly cap reset logged in activity_log with order_id, reset_at, previous_delivered_count
