---
phase: 24-pricing-engine
plan: 01
subsystem: pricing
tags: [pricing, admin-settings, lead-prices, broker-overrides]

requires:
  - phase: none
    provides: existing orders/brokers schema, admin settings page, supabase admin client
provides:
  - lead_prices database migration
  - pricing schema with validation
  - CRUD server actions (fetchPrices, upsertPrice, updatePrice, deletePrice)
  - getLeadPrice() lookup with broker override fallback
  - admin pricing table UI on Settings page
affects: [24-pricing-engine, broker-portal-orders]

tech-stack:
  added: []
  patterns: [pricing-cents-integer, broker-override-fallback, upsert-on-conflict]

key-files:
  created:
    - supabase/migrations/00027_lead_prices.sql
    - src/lib/schemas/pricing.ts
    - src/lib/actions/pricing.ts
    - src/lib/pricing/lookup.ts
    - src/components/admin/pricing-table.tsx
  modified:
    - src/lib/types/database.ts
    - src/app/(dashboard)/settings/page.tsx

key-decisions:
  - "Prices stored in cents (integer) to avoid floating point precision issues"
  - "NULLS NOT DISTINCT unique constraint allows one default + multiple broker overrides per vertical/tier combo"
  - "Pricing table added to existing Settings page rather than creating a separate page"
  - "getLeadPrice() checks broker-specific override first, falls back to default (broker_id IS NULL)"

patterns-established:
  - "Pricing lookup: broker override > default price > null"
  - "Credit tiers: 600+ and 680+ (matches existing credit_score_min values in orders)"

requirements-completed: [PRICE-01, PRICE-02, PRICE-03]

duration: 6min
completed: 2026-03-17
---

# Plan 24-01: Pricing Engine Summary

**Per-lead pricing infrastructure with admin CRUD, broker overrides, and price lookup helper**

## Performance

- **Duration:** 6 min
- **Tasks:** 3
- **Files created:** 5
- **Files modified:** 2

## Accomplishments
- lead_prices table migration with unique constraint (vertical, credit_tier_min, broker_id) using NULLS NOT DISTINCT
- Zod pricing schema with PRICING_VERTICALS (excludes 'All') and CREDIT_TIERS (600, 680)
- Server actions: fetchPrices, upsertPrice, updatePrice, deletePrice
- getLeadPrice(vertical, creditTierMin, brokerId?) lookup with broker override fallback
- PricingTable component with inline add/edit/delete on Settings page
- Settings page now fetches prices and brokers in parallel with existing settings

## Task Commits

1. **Tasks 1-3: Complete pricing engine** - `f937a77` (feat)

## Files Created/Modified
- `supabase/migrations/00027_lead_prices.sql` - lead_prices table with RLS, unique constraint, updated_at trigger
- `src/lib/schemas/pricing.ts` - Zod validation for pricing form data
- `src/lib/actions/pricing.ts` - CRUD server actions for lead_prices
- `src/lib/pricing/lookup.ts` - getLeadPrice() with broker override fallback
- `src/components/admin/pricing-table.tsx` - Admin UI for managing pricing rows
- `src/lib/types/database.ts` - Added lead_prices table types
- `src/app/(dashboard)/settings/page.tsx` - Integrated PricingTable below SettingsForm

## Decisions Made
- Used NULLS NOT DISTINCT in unique constraint so default prices (broker_id NULL) are properly deduplicated
- Pricing table embedded in Settings page with red gradient separator between sections
- Price input accepts dollars, converts to cents internally for storage
- Select components handle base-ui's nullable onValueChange properly

## Deviations from Plan
None

## Issues Encountered
None

## Next Phase Readiness
- getLeadPrice() ready for Phase 25 broker portal order form
- PRICING_VERTICALS and CREDIT_TIERS constants exported for reuse
- Broker select dropdown pattern established for order form

---
*Phase: 24-pricing-engine*
*Completed: 2026-03-17*
