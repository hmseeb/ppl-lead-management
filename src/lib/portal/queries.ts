import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalDateRange } from '@/lib/types/portal-filters'
import type { PortalDateFilters } from '@/lib/types/portal-filters'
import { startOfDay, addDays, format, differenceInDays } from 'date-fns'

/**
 * Sanitize user input for PostgREST ilike filter interpolation.
 * Strips characters that could manipulate the filter expression:
 * commas (value separator), dots (column accessor), parens (grouping),
 * backslashes (escape sequences).
 */
function sanitizeSearch(input: string): string {
  return input.replace(/[,.()\\/]/g, '')
}

/**
 * Broker-scoped query helpers for the portal.
 *
 * Every function filters by brokerId so portal code can never
 * accidentally access another broker's data. Uses createAdminClient()
 * (service role) with explicit broker_id filters.
 *
 * RLS policies are a second layer of defense for any future
 * anon-key access paths.
 */

export async function getPortalBroker(brokerId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, email, phone, company_name, state, primary_vertical, secondary_vertical, timezone, assignment_status')
    .eq('id', brokerId)
    .single()

  if (error) return null
  return data
}

export async function getPortalLeads(
  brokerId: string,
  opts?: { limit?: number; offset?: number; status?: string }
) {
  const supabase = createAdminClient()
  let query = supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, business_name, vertical, credit_score, funding_amount, status, assigned_at, created_at', { count: 'exact' })
    .eq('assigned_broker_id', brokerId)
    .order('assigned_at', { ascending: false })

  if (opts?.status) {
    query = query.eq('status', opts.status)
  }

  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return { leads: [], count: 0 }
  return { leads: data ?? [], count: count ?? 0 }
}

export async function getPortalOrders(brokerId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, total_leads, leads_delivered, leads_remaining, verticals, credit_score_min, status, bonus_mode, order_type, priority, created_at, updated_at')
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function getPortalDeliveries(
  brokerId: string,
  opts?: { leadId?: string; limit?: number; offset?: number }
) {
  const supabase = createAdminClient()
  let query = supabase
    .from('deliveries')
    .select('id, lead_id, order_id, channel, status, error_message, retry_count, sent_at, created_at', { count: 'exact' })
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false })

  if (opts?.leadId) {
    query = query.eq('lead_id', opts.leadId)
  }

  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return { deliveries: [], count: 0 }
  return { deliveries: data ?? [], count: count ?? 0 }
}

/* ------------------------------------------------------------------ */
/*  Dashboard queries                                                  */
/* ------------------------------------------------------------------ */

export type ActiveOrder = {
  id: string
  total_leads: number
  leads_delivered: number
  leads_remaining: number
  verticals: string[]
  credit_score_min: number | null
  status: string
  priority: string
  order_type: string
  created_at: string
}

/**
 * Active orders for this broker with progress data.
 */
export async function fetchBrokerActiveOrders(brokerId: string): Promise<ActiveOrder[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, total_leads, leads_delivered, leads_remaining, verticals, credit_score_min, status, priority, order_type, created_at')
    .eq('broker_id', brokerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as ActiveOrder[]
}

export type RecentLead = {
  id: string
  first_name: string | null
  last_name: string | null
  vertical: string | null
  credit_score: number | null
  assigned_at: string | null
}

/**
 * Most recent leads assigned to this broker.
 * When dateFilters is provided, scopes results to the selected date range.
 */
export async function fetchBrokerRecentLeads(
  brokerId: string,
  limit = 20,
  dateFilters?: PortalDateFilters
): Promise<RecentLead[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from('leads')
    .select('id, first_name, last_name, vertical, credit_score, assigned_at')
    .eq('assigned_broker_id', brokerId)
    .order('assigned_at', { ascending: false })
    .limit(limit)

  if (dateFilters) {
    const { from, to } = getPortalDateRange(dateFilters)
    query = query.gte('assigned_at', from).lte('assigned_at', to)
  }

  const { data, error } = await query

  if (error) return []
  return (data ?? []) as RecentLead[]
}

export type SpendSummary = {
  totalAllTimeCents: number
  totalThisMonthCents: number
  totalInRangeCents: number
  activeOrderValueCents: number
}

/**
 * Spend summary for this broker.
 *
 * Calculates spend from lead_prices table joined against delivered leads.
 * If no prices are configured, returns zeroes.
 * When dateFilters is provided, totalInRangeCents reflects spend within that range.
 */
export async function fetchBrokerSpendSummary(
  brokerId: string,
  dateFilters?: PortalDateFilters
): Promise<SpendSummary> {
  const supabase = createAdminClient()

  // Get all prices (broker-specific + defaults)
  const { data: prices } = await supabase
    .from('lead_prices')
    .select('vertical, credit_tier_min, price_cents, broker_id')
    .or(`broker_id.eq.${brokerId},broker_id.is.null`)

  // Build price lookup: broker override > default
  const priceMap = new Map<string, number>()
  const defaultMap = new Map<string, number>()
  for (const p of prices ?? []) {
    const key = `${p.vertical}:${p.credit_tier_min}`
    if (p.broker_id === brokerId) {
      priceMap.set(key, p.price_cents)
    } else {
      defaultMap.set(key, p.price_cents)
    }
  }
  // Merge: broker overrides take precedence
  for (const [key, val] of defaultMap) {
    if (!priceMap.has(key)) priceMap.set(key, val)
  }

  // If no prices configured, short-circuit
  if (priceMap.size === 0) {
    return { totalAllTimeCents: 0, totalThisMonthCents: 0, totalInRangeCents: 0, activeOrderValueCents: 0 }
  }

  // Resolve date range for in-range calculation
  const dateRange = dateFilters ? getPortalDateRange(dateFilters) : null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Determine the earliest date we need, then fetch from DB with that cutoff.
  // allTime still needs a full scan, but we limit to 10k rows as a safety cap.
  // thisMonth and inRange are filtered in JS from the same result set.
  const baseQuery = () => supabase
    .from('leads')
    .select('vertical, credit_score, assigned_at')
    .eq('assigned_broker_id', brokerId)
    .eq('status', 'assigned')

  // Parallel: fetch leads + active orders at the same time
  const [{ data: deliveredLeads }, { data: activeOrders }] = await Promise.all([
    baseQuery().order('assigned_at', { ascending: false }).limit(10000),
    supabase
      .from('orders')
      .select('total_leads, verticals, credit_score_min')
      .eq('broker_id', brokerId)
      .eq('status', 'active'),
  ])

  let totalAllTime = 0
  let totalThisMonth = 0
  let totalInRange = 0

  for (const lead of deliveredLeads ?? []) {
    const price = lookupPrice(priceMap, lead.vertical, lead.credit_score)
    if (price > 0) {
      totalAllTime += price
      if (lead.assigned_at && lead.assigned_at >= monthStart) {
        totalThisMonth += price
      }
      if (dateRange && lead.assigned_at && lead.assigned_at >= dateRange.from && lead.assigned_at <= dateRange.to) {
        totalInRange += price
      }
    }
  }

  let activeOrderValue = 0
  for (const order of activeOrders ?? []) {
    const vertical = order.verticals?.[0] ?? null
    const tier = order.credit_score_min ?? 600
    const price = lookupPrice(priceMap, vertical, tier)
    activeOrderValue += price * (order.total_leads ?? 0)
  }

  return {
    totalAllTimeCents: totalAllTime,
    totalThisMonthCents: totalThisMonth,
    totalInRangeCents: totalInRange,
    activeOrderValueCents: activeOrderValue,
  }
}

/** Find the best price match for a vertical + credit score. */
function lookupPrice(
  priceMap: Map<string, number>,
  vertical: string | null,
  creditScore: number | null
): number {
  if (!vertical) return 0
  // Try exact tier match first (680, then 600)
  const score = creditScore ?? 0
  const tiers = [680, 600].filter((t) => score >= t)
  for (const tier of tiers) {
    const price = priceMap.get(`${vertical}:${tier}`)
    if (price !== undefined) return price
  }
  // Fallback: try lowest tier
  const fallback = priceMap.get(`${vertical}:600`)
  return fallback ?? 0
}

/* ------------------------------------------------------------------ */
/*  Lead volume trend                                                  */
/* ------------------------------------------------------------------ */

export type LeadVolumeTrendData = {
  data: { date: string; label: string; count: number }[]
  bucketType: 'daily' | 'weekly'
  totalDays: number
}

/**
 * Lead volume over time for this broker, bucketed daily or weekly.
 * Follows the same bucketing pattern as fetchPortalCallOutcomeVolume.
 */
export async function fetchBrokerLeadVolumeTrend(
  brokerId: string,
  dateFilters?: PortalDateFilters
): Promise<LeadVolumeTrendData> {
  const supabase = createAdminClient()
  const { from, to } = getPortalDateRange(dateFilters ?? {})
  const fromDate = startOfDay(new Date(from))
  const toDate = new Date(to)
  const totalDays = Math.max(1, differenceInDays(toDate, fromDate) + 1)
  const bucketType: 'daily' | 'weekly' = totalDays > 30 ? 'weekly' : 'daily'

  const { data: rows } = await supabase
    .from('leads')
    .select('assigned_at')
    .eq('assigned_broker_id', brokerId)
    .gte('assigned_at', from)
    .lte('assigned_at', to)

  // Bucket results in TypeScript
  const bucketMap = new Map<string, number>()

  for (const row of rows ?? []) {
    if (!row.assigned_at) continue
    const rowDate = new Date(row.assigned_at)
    let bucketKey: string

    if (bucketType === 'daily') {
      bucketKey = format(startOfDay(rowDate), 'yyyy-MM-dd')
    } else {
      const daysSinceStart = differenceInDays(rowDate, fromDate)
      const weekIndex = Math.floor(daysSinceStart / 7)
      const weekStart = addDays(fromDate, weekIndex * 7)
      bucketKey = format(weekStart, 'yyyy-MM-dd')
    }

    bucketMap.set(bucketKey, (bucketMap.get(bucketKey) ?? 0) + 1)
  }

  // Build ordered bucket array with zero-fill
  const data: LeadVolumeTrendData['data'] = []

  if (bucketType === 'daily') {
    const useShortLabel = totalDays <= 7
    for (let i = 0; i < totalDays; i++) {
      const day = addDays(fromDate, i)
      const key = format(day, 'yyyy-MM-dd')
      data.push({
        date: key,
        label: useShortLabel ? format(day, 'EEE') : format(day, 'MMM d'),
        count: bucketMap.get(key) ?? 0,
      })
    }
  } else {
    const weekCount = Math.ceil(totalDays / 7)
    for (let i = 0; i < weekCount; i++) {
      const weekStart = addDays(fromDate, i * 7)
      const key = format(weekStart, 'yyyy-MM-dd')
      data.push({
        date: key,
        label: format(weekStart, 'MMM d'),
        count: bucketMap.get(key) ?? 0,
      })
    }
  }

  return { data, bucketType, totalDays }
}

/* ------------------------------------------------------------------ */
/*  Average credit score                                               */
/* ------------------------------------------------------------------ */

export type AvgCreditScoreData = {
  average: number | null
  count: number
}

/**
 * Average credit score across leads assigned to this broker within date range.
 * Only includes leads with a non-null credit_score.
 */
export async function fetchBrokerAvgCreditScore(
  brokerId: string,
  dateFilters?: PortalDateFilters
): Promise<AvgCreditScoreData> {
  const supabase = createAdminClient()
  const { from, to } = getPortalDateRange(dateFilters ?? {})

  const { data: rows } = await supabase
    .from('leads')
    .select('credit_score')
    .eq('assigned_broker_id', brokerId)
    .not('credit_score', 'is', null)
    .gte('assigned_at', from)
    .lte('assigned_at', to)

  const scores = (rows ?? []).map((r) => r.credit_score as number)
  if (scores.length === 0) return { average: null, count: 0 }

  const sum = scores.reduce((acc, s) => acc + s, 0)
  return { average: Math.round(sum / scores.length), count: scores.length }
}

/* ------------------------------------------------------------------ */
/*  Billing queries                                                    */
/* ------------------------------------------------------------------ */

export type BillingOrder = {
  id: string
  verticals: string[]
  total_leads: number
  leads_delivered: number
  status: string
  total_price_cents: number | null
  price_per_lead_cents: number | null
  stripe_checkout_session_id: string | null
  created_at: string
}

/**
 * All orders for this broker, sorted newest first.
 * Used on the billing page to show payment history.
 */
export async function fetchBrokerBillingOrders(brokerId: string): Promise<BillingOrder[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, verticals, total_leads, leads_delivered, status, total_price_cents, price_per_lead_cents, stripe_checkout_session_id, created_at')
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as BillingOrder[]
}

export type DeliveryHealth = {
  channel: string
  total: number
  sent: number
  failed: number
  pending: number
  successRate: number
}

/**
 * Delivery health grouped by channel for this broker.
 * When dateFilters is provided, scopes to deliveries within the selected date range.
 */
export async function fetchBrokerDeliveryHealth(
  brokerId: string,
  dateFilters?: PortalDateFilters
): Promise<DeliveryHealth[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from('deliveries')
    .select('channel, status')
    .eq('broker_id', brokerId)

  if (dateFilters) {
    const { from, to } = getPortalDateRange(dateFilters)
    query = query.gte('created_at', from).lte('created_at', to)
  }

  const { data, error } = await query

  if (error || !data) return []

  // Group by channel
  const channelMap = new Map<string, { total: number; sent: number; failed: number; pending: number }>()

  for (const d of data) {
    let entry = channelMap.get(d.channel)
    if (!entry) {
      entry = { total: 0, sent: 0, failed: 0, pending: 0 }
      channelMap.set(d.channel, entry)
    }
    entry.total++
    if (d.status === 'sent') entry.sent++
    else if (d.status === 'failed' || d.status === 'failed_permanent') entry.failed++
    else entry.pending++
  }

  const results: DeliveryHealth[] = []
  for (const [channel, counts] of channelMap) {
    results.push({
      channel,
      ...counts,
      successRate: counts.total > 0 ? Math.round((counts.sent / counts.total) * 100) : 0,
    })
  }

  return results.sort((a, b) => b.total - a.total)
}

/* ------------------------------------------------------------------ */
/*  Broker settings (self-service)                                     */
/* ------------------------------------------------------------------ */

export type BrokerSettings = {
  delivery_methods: string[] | null
  crm_webhook_url: string | null
  delivery_email: string | null
  delivery_phone: string | null
  contact_hours: string | null
  custom_hours_start: string | null
  custom_hours_end: string | null
  weekend_pause: boolean | null
  timezone: string | null
}

export async function getPortalBrokerSettings(brokerId: string): Promise<BrokerSettings | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('brokers')
    .select('delivery_methods, crm_webhook_url, delivery_email, delivery_phone, contact_hours, custom_hours_start, custom_hours_end, weekend_pause, timezone')
    .eq('id', brokerId)
    .single()

  if (error) return null
  return data as BrokerSettings
}

/* ------------------------------------------------------------------ */
/*  Lead delivery attempt history                                      */
/* ------------------------------------------------------------------ */

export type DeliveryAttempt = {
  id: string
  channel: string
  status: string
  error_message: string | null
  retry_count: number
  sent_at: string | null
  created_at: string
}

/**
 * All delivery attempts for a single lead, scoped to the broker.
 * Ordered oldest-first so the timeline reads chronologically top-to-bottom.
 */
export async function fetchLeadDeliveryAttempts(
  brokerId: string,
  leadId: string
): Promise<DeliveryAttempt[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('deliveries')
    .select('id, channel, status, error_message, retry_count, sent_at, created_at')
    .eq('broker_id', brokerId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as DeliveryAttempt[]
}

/* ------------------------------------------------------------------ */
/*  Paginated leads with delivery status                               */
/* ------------------------------------------------------------------ */

export type LeadWithDelivery = {
  id: string
  first_name: string | null
  last_name: string | null
  vertical: string | null
  credit_score: number | null
  funding_amount: number | null
  status: string | null
  assigned_at: string | null
  created_at: string
  delivery_status: string | null
  delivery_channel: string | null
}

const DELIVERY_STATUS_PRIORITY: Record<string, number> = {
  sent: 0,
  retrying: 1,
  queued: 2,
  failed: 3,
  failed_permanent: 4,
}

/**
 * Paginated leads for a broker with best delivery status per lead.
 * Supports optional search (name ilike), vertical, and delivery status filters.
 */
export async function fetchBrokerLeadsPaginated(
  brokerId: string,
  page = 1,
  perPage = 20,
  filters?: { search?: string; vertical?: string; deliveryStatus?: string }
): Promise<{ leads: LeadWithDelivery[]; total: number }> {
  const supabase = createAdminClient()
  const offset = (page - 1) * perPage

  // If filtering by delivery status, pre-fetch matching lead IDs from deliveries table
  if (filters?.deliveryStatus) {
    const { data: matchingDeliveries } = await supabase
      .from('deliveries')
      .select('lead_id')
      .eq('broker_id', brokerId)
      .eq('status', filters.deliveryStatus)

    const matchingLeadIds = [...new Set((matchingDeliveries ?? []).map((d) => d.lead_id))]
    if (matchingLeadIds.length === 0) return { leads: [], total: 0 }

    // Build query with delivery status pre-filter
    let query = supabase
      .from('leads')
      .select(
        'id, first_name, last_name, vertical, credit_score, funding_amount, status, assigned_at, created_at',
        { count: 'exact' }
      )
      .eq('assigned_broker_id', brokerId)
      .in('id', matchingLeadIds)

    if (filters?.search) {
      const safe = sanitizeSearch(filters.search)
      query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`)
    }
    if (filters?.vertical) {
      query = query.eq('vertical', filters.vertical)
    }

    const { data: leadsData, error, count } = await query
      .order('assigned_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error || !leadsData) return { leads: [], total: 0 }

    return {
      leads: leadsData.map((lead) => ({
        ...lead,
        delivery_status: filters.deliveryStatus!,
        delivery_channel: null,
      })),
      total: count ?? 0,
    }
  }

  // Standard path: no delivery status filter
  let query = supabase
    .from('leads')
    .select(
      'id, first_name, last_name, vertical, credit_score, funding_amount, status, assigned_at, created_at',
      { count: 'exact' }
    )
    .eq('assigned_broker_id', brokerId)

  if (filters?.search) {
    const safe = sanitizeSearch(filters.search)
    query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`)
  }
  if (filters?.vertical) {
    query = query.eq('vertical', filters.vertical)
  }

  const { data: leadsData, error, count } = await query
    .order('assigned_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error || !leadsData) return { leads: [], total: 0 }

  // Fetch delivery statuses for this page of leads
  const leadIds = leadsData.map((l) => l.id)
  const deliveryMap = new Map<string, { status: string; channel: string }>()

  if (leadIds.length > 0) {
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('lead_id, status, channel')
      .in('lead_id', leadIds)

    if (deliveries) {
      for (const d of deliveries) {
        const existing = deliveryMap.get(d.lead_id)
        const existingPriority = existing
          ? (DELIVERY_STATUS_PRIORITY[existing.status] ?? 99)
          : 99
        const newPriority = DELIVERY_STATUS_PRIORITY[d.status] ?? 99
        if (newPriority < existingPriority) {
          deliveryMap.set(d.lead_id, { status: d.status, channel: d.channel })
        }
      }
    }
  }

  const leads: LeadWithDelivery[] = leadsData.map((lead) => {
    const delivery = deliveryMap.get(lead.id)
    return {
      ...lead,
      delivery_status: delivery?.status ?? null,
      delivery_channel: delivery?.channel ?? null,
    }
  })

  return { leads, total: count ?? 0 }
}

/* ------------------------------------------------------------------ */
/*  Monthly spend trend                                                */
/* ------------------------------------------------------------------ */

export type MonthlySpend = {
  month: string    // "YYYY-MM" format
  label: string    // "Jan '25", "Feb '25", etc. for chart display
  totalCents: number
}

/**
 * Monthly spend aggregation for the last N months.
 * Returns one entry per month (zero-filled for months with no orders).
 * Sorted chronologically, oldest first.
 * When dateFilters is provided, uses the date range instead of "last N months" cutoff.
 */
/* ------------------------------------------------------------------ */
/*  Credit tier distribution                                           */
/* ------------------------------------------------------------------ */

export type CreditTierDistribution = {
  tiers: { tier: string; min: number; max: number | null; count: number; color: string }[]
  total: number
}

/**
 * Credit score tier distribution for this broker's leads.
 * Returns fixed tiers (500-599, 600-679, 680+) with optional Under 500.
 */
export async function fetchBrokerCreditTierDistribution(
  brokerId: string,
  dateFilters?: PortalDateFilters
): Promise<CreditTierDistribution> {
  const supabase = createAdminClient()
  const { from, to } = getPortalDateRange(dateFilters ?? {})

  const { data: rows } = await supabase
    .from('leads')
    .select('credit_score')
    .eq('assigned_broker_id', brokerId)
    .not('credit_score', 'is', null)
    .gte('assigned_at', from)
    .lte('assigned_at', to)

  const scores = (rows ?? []).map((r) => r.credit_score as number)

  const mainTiers: CreditTierDistribution['tiers'] = [
    { tier: '500-599', min: 500, max: 599, count: 0, color: '#f43f5e' },
    { tier: '600-679', min: 600, max: 679, count: 0, color: '#f59e0b' },
    { tier: '680+', min: 680, max: null, count: 0, color: '#10b981' },
  ]

  let under500Count = 0

  for (const score of scores) {
    if (score < 500) {
      under500Count++
    } else if (score <= 599) {
      mainTiers[0].count++
    } else if (score <= 679) {
      mainTiers[1].count++
    } else {
      mainTiers[2].count++
    }
  }

  const tiers: CreditTierDistribution['tiers'] = under500Count > 0
    ? [{ tier: 'Under 500', min: 0, max: 499, count: under500Count, color: '#6b7280' }, ...mainTiers]
    : mainTiers

  return { tiers, total: scores.length }
}

/* ------------------------------------------------------------------ */
/*  Vertical mix                                                       */
/* ------------------------------------------------------------------ */

export type VerticalMixData = {
  verticals: { vertical: string; count: number; percent: number }[]
  total: number
}

/**
 * Vertical distribution for this broker's leads.
 * Sorted by count descending with percentages.
 */
export async function fetchBrokerVerticalMix(
  brokerId: string,
  dateFilters?: PortalDateFilters
): Promise<VerticalMixData> {
  const supabase = createAdminClient()
  const { from, to } = getPortalDateRange(dateFilters ?? {})

  const { data: rows } = await supabase
    .from('leads')
    .select('vertical')
    .eq('assigned_broker_id', brokerId)
    .not('vertical', 'is', null)
    .gte('assigned_at', from)
    .lte('assigned_at', to)

  const verticalMap = new Map<string, number>()
  for (const row of rows ?? []) {
    const v = row.vertical as string
    verticalMap.set(v, (verticalMap.get(v) ?? 0) + 1)
  }

  const total = (rows ?? []).length
  const verticals = [...verticalMap.entries()]
    .map(([vertical, count]) => ({
      vertical,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return { verticals, total }
}

/* ------------------------------------------------------------------ */
/*  Monthly spend trend                                                */
/* ------------------------------------------------------------------ */

export async function fetchBrokerMonthlySpend(
  brokerId: string,
  months = 12,
  dateFilters?: PortalDateFilters
): Promise<MonthlySpend[]> {
  const supabase = createAdminClient()

  const now = new Date()
  let cutoff: Date

  if (dateFilters) {
    const { from } = getPortalDateRange(dateFilters)
    cutoff = new Date(from)
    // Align to start of month
    cutoff.setDate(1)
    cutoff.setHours(0, 0, 0, 0)
  } else {
    cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
  }

  const { data, error } = await supabase
    .from('orders')
    .select('total_price_cents, created_at')
    .eq('broker_id', brokerId)
    .not('total_price_cents', 'is', null)
    .gte('created_at', cutoff.toISOString())

  // Group by month in JS
  const monthMap = new Map<string, number>()
  if (!error && data) {
    for (const order of data) {
      const d = new Date(order.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, (monthMap.get(key) ?? 0) + (order.total_price_cents ?? 0))
    }
  }

  // Generate full month range with zero-fill
  const results: MonthlySpend[] = []
  const cursor = new Date(cutoff.getFullYear(), cutoff.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)

  while (cursor <= end) {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const key = `${y}-${String(m + 1).padStart(2, '0')}`
    const shortLabel = `${new Date(y, m).toLocaleString('en-US', { month: 'short' })} '${String(y).slice(2)}`

    results.push({
      month: key,
      label: shortLabel,
      totalCents: monthMap.get(key) ?? 0,
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return results
}
