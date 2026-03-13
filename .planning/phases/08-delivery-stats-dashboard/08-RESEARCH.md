# Phase 8: Delivery Stats Dashboard - Research

**Researched:** 2026-03-13
**Domain:** Dashboard UI (Next.js Server Components + Supabase queries + Realtime)
**Confidence:** HIGH

## Summary

Phase 8 adds delivery health metrics to the existing admin dashboard. The dashboard already displays 5 KPI cards (leads today, assigned, unassigned, active brokers, active orders), a 7-day lead volume bar chart, and a recent activity feed. All three sections are server-rendered via `fetchKpis()`, `fetchLeadVolume7Days()`, and `fetchRecentActivity()` queries in `src/lib/queries/dashboard.ts`, with real-time refresh driven by `RealtimeListener` which already listens for `deliveries` and `unassigned_queue` table changes.

The deliveries table has three channels (`crm_webhook`, `email`, `sms`) and five status values (`pending`, `sent`, `failed`, `retrying`, `failed_permanent`). All the data needed for MNTR-01 through MNTR-05 already exists in the `deliveries` and `leads` tables. The implementation requires: one new query function (`fetchDeliveryStats`), one new component (`DeliveryStatsCards`), a channel health indicator component, and wiring them into the existing dashboard page. No new dependencies. No new tables. No new migrations (inline queries are sufficient, a SQL view is optional).

The primary risk is Realtime refresh storms. The existing `RealtimeListener` calls `router.refresh()` on every `deliveries` table change with no debouncing. A batch of 10 lead assignments creates 30 delivery rows (3 channels each), triggering 30 full page refreshes. Adding delivery stats to the dashboard makes this worse because each refresh now runs more queries. The fix is adding debounce logic to the RealtimeListener.

**Primary recommendation:** Add a `fetchDeliveryStats()` server function alongside existing KPI queries, a new `DeliveryStatsCards` component below the existing KPI row, and debounce the RealtimeListener. Use inline Supabase queries (not a SQL view) to match the existing pattern.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MNTR-01 | Dashboard shows today's lead counts (received, assigned, unassigned) | Existing `fetchKpis()` already returns `leadsToday`, `assignedCount`, `unassignedCount`. Already satisfied by existing dashboard. Verify and potentially add "today" scoping to assigned/unassigned counts. |
| MNTR-02 | Dashboard shows today's delivery counts by channel (webhook, email, SMS) | New `fetchDeliveryStats()` query grouping deliveries by `channel` column with `created_at >= startOfDay(now())` filter. Channel values: `crm_webhook`, `email`, `sms`. |
| MNTR-03 | Dashboard shows today's failed delivery count with channel breakdown | Same query as MNTR-02 but filtering `status IN ('failed', 'failed_permanent')` and grouping by channel. |
| MNTR-04 | Delivery stats update in real-time via existing Supabase Realtime | `RealtimeListener` already subscribes to `deliveries` table changes and calls `router.refresh()`. Server components will re-fetch automatically. Needs debounce. |
| MNTR-05 | Channel health indicators show color-coded status (green/yellow/red) | Derive from failure rate per channel: green (0% failures), yellow (>0% but <25%), red (>=25%). Simple conditional CSS with existing Tailwind color utilities. |
</phase_requirements>

## Standard Stack

### Core (already installed, no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Server Components for data fetching | Already used for all dashboard queries |
| React | 19.2.3 | UI rendering | Already used throughout |
| @supabase/supabase-js | 2.99.1 | Database queries | Already used via `createAdminClient()` |
| recharts | 3.8.0 | Charts (if needed for delivery breakdown) | Already used for lead volume chart |
| lucide-react | 0.577.0 | Icons | Already used for KPI cards |
| date-fns | ^4.1.0 | Date calculations (startOfDay) | Already used in dashboard.ts |
| ShadCN (Card, Badge) | 4.0.5 | UI components | Already installed and used in KPI cards |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4.x | Styling, color-coding | Health indicators (green/yellow/red) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline Supabase queries | SQL view (`delivery_stats_today`) | View is cleaner but adds a migration. Inline queries match the existing pattern in `fetchKpis()`. Use inline queries for consistency. |
| ShadCN chart component | Direct recharts (current pattern) | The project already uses recharts directly without the ShadCN chart wrapper. Keep using direct recharts for consistency. |
| Separate delivery stats page | Inline on main dashboard | Requirements say "at a glance on the existing dashboard". Keep it on the main page. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/queries/dashboard.ts        # ADD fetchDeliveryStats() here
├── components/dashboard/
│   ├── kpi-cards.tsx               # EXISTING - no changes needed
│   ├── delivery-stats-cards.tsx    # NEW - delivery KPI cards + channel health
│   ├── lead-volume-chart.tsx       # EXISTING - no changes
│   └── activity-feed.tsx           # EXISTING - no changes
├── components/realtime-listener.tsx # MODIFY - add debounce
└── app/(dashboard)/page.tsx         # MODIFY - add fetchDeliveryStats + DeliveryStatsCards
```

### Pattern 1: Server Component Data Fetching (existing pattern)
**What:** Dashboard page is an async server component that fetches data in parallel via `Promise.all`, then passes data to presentation components.
**When to use:** Always for dashboard data. This is the established pattern.
**Example:**
```typescript
// Source: src/app/(dashboard)/page.tsx (existing)
export default async function DashboardPage() {
  const [kpis, activity, volume, deliveryStats] = await Promise.all([
    fetchKpis(),
    fetchRecentActivity(),
    fetchLeadVolume7Days(),
    fetchDeliveryStats(), // NEW
  ])

  return (
    <div className="space-y-6">
      {/* ... existing header ... */}
      <KpiCards data={kpis} />
      <DeliveryStatsCards data={deliveryStats} /> {/* NEW */}
      {/* ... existing chart + activity ... */}
    </div>
  )
}
```

### Pattern 2: KPI Card Layout (existing pattern)
**What:** A grid of `Card` components with icon, title, big number, and subtitle. Uses responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-N`.
**When to use:** For the delivery stats cards.
**Example:**
```typescript
// Source: src/components/dashboard/kpi-cards.tsx (existing pattern)
<Card className={glowColor}>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {title}
    </CardTitle>
    <Icon className={`size-4 ${iconColor}`} />
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
      {value}
    </div>
    <p className="text-[10px] text-muted-foreground mt-1.5">{subtitle}</p>
  </CardContent>
</Card>
```

### Pattern 3: Supabase Count Queries (existing pattern)
**What:** Use `select('id', { count: 'exact', head: true })` for count-only queries. Returns `count` property without fetching row data.
**When to use:** For all delivery count queries.
**Example:**
```typescript
// Source: src/lib/queries/dashboard.ts (existing pattern)
const { count } = await supabase
  .from('deliveries')
  .select('id', { count: 'exact', head: true })
  .gte('created_at', todayStart)
  .eq('channel', 'crm_webhook')
```

### Pattern 4: Channel Health Indicator
**What:** A small colored dot or badge next to each channel name indicating health status.
**When to use:** For MNTR-05 channel health visualization.
**Example:**
```typescript
// Derive health color from failure rate
function getHealthColor(total: number, failed: number): string {
  if (total === 0) return 'text-muted-foreground' // no data = gray
  const failRate = failed / total
  if (failRate === 0) return 'text-emerald-400'    // green = all good
  if (failRate < 0.25) return 'text-amber-400'     // yellow = some failures
  return 'text-red-400'                             // red = high failure rate
}
```

### Anti-Patterns to Avoid
- **Fetching all delivery rows to count client-side:** Use `{ count: 'exact', head: true }` for counts. The deliveries table can grow large.
- **Creating a separate API route for stats:** The dashboard is a server component. Fetch directly from the server component using `createAdminClient()`.
- **Adding a SQL view for something this simple:** The existing dashboard uses inline Supabase JS queries, not views. Match the pattern.
- **Using `useEffect` + `useState` for data fetching:** The dashboard pattern is server components with `router.refresh()` for updates. Not client-side fetch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounce logic | Custom debounce implementation | A simple `setTimeout`/`clearTimeout` pattern in the RealtimeListener | Only need basic debounce, not a library. ~5 lines of code. |
| Health color thresholds | Complex health scoring system | Simple conditional based on failure percentage (0%, <25%, >=25%) | Requirements say green/yellow/red. Three states. Keep it simple. |
| Real-time delivery updates | WebSocket subscription + client state | Existing `RealtimeListener` + `router.refresh()` | Already wired up. The listener already subscribes to `deliveries` table changes. |
| Date filtering for "today" | Custom date logic | `startOfDay(new Date())` from date-fns | Already used in `fetchKpis()` for `leadsToday`. |

**Key insight:** This phase is purely additive UI. Every infrastructure piece already exists. The risk is in adding complexity, not in missing infrastructure.

## Common Pitfalls

### Pitfall 1: Realtime Refresh Storm
**What goes wrong:** Batch lead arrivals create N delivery rows, each triggering `router.refresh()`. With delivery stats added, each refresh runs ~10 queries instead of ~7. The page flickers and the server gets hammered.
**Why it happens:** `RealtimeListener` has no debounce. Every Postgres change event immediately triggers a full server component refresh.
**How to avoid:** Add debounce to `RealtimeListener`. Use `setTimeout` with 500ms delay, clearing previous timeout on each new event. Cap at 2s max wait so updates aren't delayed too long.
**Warning signs:** Dashboard flickers on lead arrival. Multiple rapid server requests in network tab.

### Pitfall 2: MNTR-01 Scoping Issue
**What goes wrong:** The existing `assignedCount` and `unassignedCount` in `fetchKpis()` are ALL-TIME counts (no date filter), but MNTR-01 says "today's lead counts". The dashboard currently shows total assigned/unassigned, not today's.
**Why it happens:** `fetchKpis()` queries `leads` with `.eq('status', 'assigned')` (no date filter) for assigned count.
**How to avoid:** Verify whether MNTR-01 means "today's new leads by status" or "current totals" (which already exist). The requirement text says "today's lead counts (received, assigned, unassigned)". "Received" = `leadsToday` (already has date filter). For "assigned" and "unassigned", add `created_at >= todayStart` filter or scope to leads received today that are now assigned/unassigned. The simplest interpretation: leads received today, broken down by current status.
**Warning signs:** Dashboard shows same numbers as existing KPI cards with no new information.

### Pitfall 3: Channel Count Mismatch
**What goes wrong:** A single lead can have multiple delivery rows (one per channel). Counting deliveries and comparing to lead counts is confusing. "10 leads, 30 deliveries" needs clear labeling.
**Why it happens:** `assign_lead()` inserts one delivery row per broker delivery method. A broker with all 3 methods gets 3 delivery rows per lead.
**How to avoid:** Clearly label delivery counts as "deliveries" not "leads". Show channel breakdown prominently so the numbers make sense. Example: "30 deliveries (12 webhook, 10 email, 8 SMS)".
**Warning signs:** Admin confused why delivery count is 3x lead count.

### Pitfall 4: Empty State
**What goes wrong:** Dashboard looks broken when there are zero deliveries today (early morning, weekends, new deployment).
**Why it happens:** No data handling for zero-state.
**How to avoid:** Show "0" with muted styling and a helpful subtitle like "No deliveries yet today". Health indicators should show gray (neutral) not green when there's no data.
**Warning signs:** Empty cards, NaN percentages, division by zero in health calculation.

### Pitfall 5: Query Performance on Large Tables
**What goes wrong:** As deliveries table grows, unindexed date-range queries slow down.
**Why it happens:** The `created_at` column on `deliveries` is not indexed for date-range filtering. Existing indexes are on `status,retry_count` and `lead_id`.
**How to avoid:** The existing `idx_deliveries_status` partial index helps for status-based filtering. For date-range queries, the table won't be large enough to matter in v1.1 (hundreds of rows per day). If it becomes an issue later, add `CREATE INDEX idx_deliveries_created_at ON deliveries(created_at)`. Don't pre-optimize.
**Warning signs:** Dashboard load time > 1s. Check with `EXPLAIN ANALYZE` if suspected.

## Code Examples

### fetchDeliveryStats() Query Function
```typescript
// Pattern: matches existing fetchKpis() in src/lib/queries/dashboard.ts
export async function fetchDeliveryStats() {
  const supabase = createAdminClient()
  const todayStart = startOfDay(new Date()).toISOString()

  // Parallel count queries matching existing pattern
  const [
    totalDeliveries,
    sentDeliveries,
    failedDeliveries,
    webhookTotal, webhookFailed,
    emailTotal, emailFailed,
    smsTotal, smsFailed,
  ] = await Promise.all([
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart).eq('status', 'sent'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart).in('status', ['failed', 'failed_permanent']),
    // Per-channel totals
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart).eq('channel', 'crm_webhook'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart).eq('channel', 'crm_webhook')
      .in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart).eq('channel', 'email'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart).eq('channel', 'email')
      .in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart).eq('channel', 'sms'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart).eq('channel', 'sms')
      .in('status', ['failed', 'failed_permanent']),
  ])

  return {
    total: totalDeliveries.count ?? 0,
    sent: sentDeliveries.count ?? 0,
    failed: failedDeliveries.count ?? 0,
    channels: {
      crm_webhook: { total: webhookTotal.count ?? 0, failed: webhookFailed.count ?? 0 },
      email: { total: emailTotal.count ?? 0, failed: emailFailed.count ?? 0 },
      sms: { total: smsTotal.count ?? 0, failed: smsFailed.count ?? 0 },
    },
  }
}
```

### Debounced RealtimeListener
```typescript
// Pattern: add debounce to existing RealtimeListener
'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function RealtimeListener() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastRefreshRef = useRef<number>(0)

  const debouncedRefresh = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const now = Date.now()
    const elapsed = now - lastRefreshRef.current

    // If it's been > 2s since last refresh, refresh immediately
    if (elapsed > 2000) {
      lastRefreshRef.current = now
      router.refresh()
      return
    }

    // Otherwise debounce 500ms
    timeoutRef.current = setTimeout(() => {
      lastRefreshRef.current = Date.now()
      router.refresh()
    }, 500)
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, debouncedRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unassigned_queue' }, debouncedRefresh)
      .subscribe()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      supabase.removeChannel(channel)
    }
  }, [debouncedRefresh])

  return null
}
```

### Channel Health Indicator
```typescript
// Pattern: simple status dot with tooltip-like subtitle
type ChannelHealth = 'healthy' | 'degraded' | 'critical' | 'inactive'

function getChannelHealth(total: number, failed: number): ChannelHealth {
  if (total === 0) return 'inactive'
  if (failed === 0) return 'healthy'
  if (failed / total < 0.25) return 'degraded'
  return 'critical'
}

const healthConfig: Record<ChannelHealth, { color: string; label: string }> = {
  healthy:  { color: 'bg-emerald-400', label: 'Healthy' },
  degraded: { color: 'bg-amber-400',   label: 'Degraded' },
  critical: { color: 'bg-red-400',     label: 'Critical' },
  inactive: { color: 'bg-muted',       label: 'No data' },
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `webhook_deliveries` table (webhook only) | `deliveries` table (crm_webhook, email, sms) | Migration 00011 | Stats must account for all 3 channels |
| No Realtime on deliveries | RealtimeListener subscribes to deliveries | Phase 5 | Stats auto-refresh on delivery changes |
| Manual theme handling in recharts | Still manual (no ShadCN chart wrapper) | Current | Continue using direct recharts if charts needed |

**Key schema facts:**
- Channel values: `crm_webhook`, `email`, `sms` (CHECK constraint in migration 00011)
- Status lifecycle: `pending` -> `sent` -> (`failed` -> `retrying` -> `sent` | `failed_permanent`)
- One lead can have multiple delivery rows (one per broker delivery method)
- `created_at` is `timestamptz NOT NULL DEFAULT now()`

## Open Questions

1. **MNTR-01 scoping: "today's" assigned/unassigned vs all-time**
   - What we know: Existing `fetchKpis()` returns ALL-TIME assigned/unassigned counts. `leadsToday` is already today-scoped.
   - What's unclear: Does MNTR-01 want today-only counts or is the existing all-time display sufficient?
   - Recommendation: Add today-scoped counts alongside existing totals. Show "Today: 5 received, 4 assigned, 1 unassigned" as a new delivery stats card separate from existing KPIs. The existing KPI cards remain unchanged.

2. **Delivery stats card layout: separate row or merged with existing KPIs?**
   - What we know: Current KPIs are in a 5-column grid. Adding more cards would either break the grid or make cards too narrow.
   - What's unclear: Whether to add a new section below KPIs or integrate into existing grid.
   - Recommendation: Add a NEW section below existing KPIs titled "Delivery Health" with its own grid. This keeps existing layout untouched and gives delivery stats their own visual section with channel breakdown and health indicators.

3. **Whether to include `pending` and `retrying` in stats**
   - What we know: Status values are `pending`, `sent`, `failed`, `retrying`, `failed_permanent`. Requirements mention "delivery counts by channel" and "failed delivery count".
   - What's unclear: Whether in-progress deliveries (pending, retrying) should show as a separate count.
   - Recommendation: Show total, sent (successful), and failed (failed + failed_permanent). Pending/retrying are transient states that resolve within seconds/minutes. Don't show them as separate stats to avoid confusion.

## Sources

### Primary (HIGH confidence)
- `src/app/(dashboard)/page.tsx` - Existing dashboard structure, data fetching pattern
- `src/lib/queries/dashboard.ts` - Existing KPI query pattern (count queries, date filtering)
- `src/components/dashboard/kpi-cards.tsx` - Existing card layout, styling, icon pattern
- `src/components/realtime-listener.tsx` - Existing Realtime subscription (no debounce)
- `src/lib/types/database.ts` - Deliveries table schema (channel, status, timestamps)
- `supabase/migrations/00007_webhook_deliveries.sql` - Original table, status CHECK constraint
- `supabase/migrations/00011_unified_deliveries.sql` - Channel values CHECK constraint, multi-channel delivery logic
- `supabase/migrations/00014_alert_triggers.sql` - Alert trigger patterns (confirms status values used in practice)

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` - Project-level research summary with architecture recommendations
- `.planning/REQUIREMENTS.md` - MNTR-01 through MNTR-05 requirement definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies. Everything already installed and used in the codebase.
- Architecture: HIGH - Exact same patterns as existing dashboard. Server components, Supabase count queries, Card UI, Realtime refresh.
- Pitfalls: HIGH - Verified against actual codebase. Refresh storm is observable in current RealtimeListener code. MNTR-01 scoping ambiguity visible in current `fetchKpis()` queries.

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days - stable patterns, no moving targets)
