import { createAdminClient } from '@/lib/supabase/admin'

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
 */
export async function fetchBrokerRecentLeads(
  brokerId: string,
  limit = 20
): Promise<RecentLead[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('leads')
    .select('id, first_name, last_name, vertical, credit_score, assigned_at')
    .eq('assigned_broker_id', brokerId)
    .order('assigned_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as RecentLead[]
}

export type SpendSummary = {
  totalAllTimeCents: number
  totalThisMonthCents: number
  activeOrderValueCents: number
}

/**
 * Spend summary for this broker.
 *
 * Calculates spend from lead_prices table joined against delivered leads.
 * If no prices are configured, returns zeroes.
 */
export async function fetchBrokerSpendSummary(brokerId: string): Promise<SpendSummary> {
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
    return { totalAllTimeCents: 0, totalThisMonthCents: 0, activeOrderValueCents: 0 }
  }

  // Get delivered leads for this broker with vertical + credit_score
  const { data: deliveredLeads } = await supabase
    .from('leads')
    .select('vertical, credit_score, assigned_at')
    .eq('assigned_broker_id', brokerId)
    .eq('status', 'assigned')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let totalAllTime = 0
  let totalThisMonth = 0

  for (const lead of deliveredLeads ?? []) {
    const price = lookupPrice(priceMap, lead.vertical, lead.credit_score)
    if (price > 0) {
      totalAllTime += price
      if (lead.assigned_at && lead.assigned_at >= monthStart) {
        totalThisMonth += price
      }
    }
  }

  // Active order value: sum(total_leads * avg price for that vertical)
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('total_leads, verticals, credit_score_min')
    .eq('broker_id', brokerId)
    .eq('status', 'active')

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
 */
export async function fetchBrokerDeliveryHealth(brokerId: string): Promise<DeliveryHealth[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('deliveries')
    .select('channel, status')
    .eq('broker_id', brokerId)

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
