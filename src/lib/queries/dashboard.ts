import { createAdminClient } from '@/lib/supabase/admin'
import { startOfDay, subDays, addDays, format, differenceInDays, min } from 'date-fns'
import type { DashboardFilters } from '@/lib/types/dashboard-filters'
import { getDateRange } from '@/lib/types/dashboard-filters'

export async function fetchKpis(filters?: DashboardFilters) {
  const supabase = createAdminClient()
  const { from, to } = getDateRange(filters ?? {})

  // Build lead query helper with optional broker/vertical filters
  function leadQuery() {
    let q = supabase.from('leads').select('id', { count: 'exact', head: true })
    if (filters?.broker_id) q = q.eq('assigned_broker_id', filters.broker_id)
    if (filters?.vertical) q = q.eq('vertical', filters.vertical)
    return q
  }

  // Build delivery query helper with optional broker/vertical filters
  function deliveryQuery() {
    const selectStr = filters?.vertical ? 'id, leads!inner(id)' : 'id'
    let q = supabase.from('deliveries').select(selectStr, { count: 'exact', head: true })
    if (filters?.broker_id) q = q.eq('broker_id', filters.broker_id)
    if (filters?.vertical) q = q.eq('leads.vertical', filters.vertical)
    return q
  }

  const [leadsInRange, assigned, unassigned, activeBrokers, activeOrders, queued, rejectedInRange, failedDeliveries, failedPermanentDeliveries] =
    await Promise.all([
      leadQuery().gte('created_at', from).lte('created_at', to),
      leadQuery().eq('status', 'assigned').gte('created_at', from).lte('created_at', to),
      leadQuery().eq('status', 'unassigned'),
      (() => {
        let q = supabase.from('brokers').select('id', { count: 'exact', head: true }).eq('assignment_status', 'active')
        if (filters?.broker_id) q = q.eq('id', filters.broker_id)
        if (filters?.vertical) q = q.eq('primary_vertical', filters.vertical)
        return q
      })(),
      (() => {
        let q = supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'active')
        if (filters?.broker_id) q = q.eq('broker_id', filters.broker_id)
        if (filters?.vertical) q = q.contains('verticals', [filters.vertical])
        return q
      })(),
      deliveryQuery().eq('status', 'queued'),
      leadQuery().gte('created_at', from).lte('created_at', to).eq('status', 'rejected'),
      deliveryQuery().gte('created_at', from).lte('created_at', to).eq('status', 'failed'),
      deliveryQuery().gte('created_at', from).lte('created_at', to).eq('status', 'failed_permanent'),
    ])

  const totalInRange = leadsInRange.count ?? 0
  const rejectedCount = rejectedInRange.count ?? 0
  const rejectedRate = totalInRange > 0 ? Math.round((rejectedCount / totalInRange) * 100) : 0

  return {
    leadsToday: totalInRange,
    leadsThisWeek: 0,
    leadsThisMonth: 0,
    assignedCount: assigned.count ?? 0,
    unassignedCount: unassigned.count ?? 0,
    activeBrokers: activeBrokers.count ?? 0,
    activeOrders: activeOrders.count ?? 0,
    queuedCount: queued.count ?? 0,
    rejectedCount,
    rejectedRate,
    failedDeliveries: (failedDeliveries.count ?? 0) + (failedPermanentDeliveries.count ?? 0),
    failedRetryable: failedDeliveries.count ?? 0,
    failedPermanent: failedPermanentDeliveries.count ?? 0,
  }
}

export type LeadVolumeResult = {
  data: { date: string; label: string; count: number }[]
  bucketType: 'daily' | 'weekly'
  totalDays: number
}

export async function fetchLeadVolume(filters?: DashboardFilters): Promise<LeadVolumeResult> {
  const supabase = createAdminClient()
  const { from, to } = getDateRange(filters ?? {})
  const fromDate = startOfDay(new Date(from))
  const toDate = new Date(to)
  const totalDays = Math.max(1, differenceInDays(toDate, fromDate) + 1)
  const bucketType: 'daily' | 'weekly' = totalDays > 30 ? 'weekly' : 'daily'

  const buckets: { date: string; label: string; count: number }[] = []

  if (bucketType === 'daily') {
    const useShortLabel = totalDays <= 7

    for (let i = totalDays - 1; i >= 0; i--) {
      const day = subDays(toDate, i)
      const dayStart = startOfDay(day).toISOString()
      const dayEnd = i === 0 ? to : startOfDay(subDays(toDate, i - 1)).toISOString()

      let q = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dayStart)
        .lt('created_at', dayEnd)

      if (filters?.broker_id) q = q.eq('assigned_broker_id', filters.broker_id)
      if (filters?.vertical) q = q.eq('vertical', filters.vertical)

      const { count } = await q

      buckets.push({
        date: format(day, 'yyyy-MM-dd'),
        label: useShortLabel ? format(day, 'EEE') : format(day, 'MMM d'),
        count: count ?? 0,
      })
    }
  } else {
    // Weekly buckets for ranges > 30 days
    const weekCount = Math.ceil(totalDays / 7)

    for (let i = 0; i < weekCount; i++) {
      const weekStart = addDays(fromDate, i * 7)
      const weekEnd = min([addDays(weekStart, 7), toDate])
      const bucketStart = startOfDay(weekStart).toISOString()
      const bucketEnd = i === weekCount - 1 ? to : startOfDay(weekEnd).toISOString()

      let q = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', bucketStart)
        .lt('created_at', bucketEnd)

      if (filters?.broker_id) q = q.eq('assigned_broker_id', filters.broker_id)
      if (filters?.vertical) q = q.eq('vertical', filters.vertical)

      const { count } = await q

      buckets.push({
        date: format(weekStart, 'yyyy-MM-dd'),
        label: format(weekStart, 'MMM d'),
        count: count ?? 0,
      })
    }
  }

  return { data: buckets, bucketType, totalDays }
}

/** @deprecated Use fetchLeadVolume instead */
export async function fetchLeadVolume7Days() {
  return fetchLeadVolume()
}

export type DeliveryStats = {
  leads: { received: number; assigned: number; unassigned: number }
  total: number
  sent: number
  failed: number
  channels: {
    crm_webhook: { total: number; failed: number }
    email: { total: number; failed: number }
    sms: { total: number; failed: number }
  }
}

export async function fetchDeliveryStats(filters?: DashboardFilters): Promise<DeliveryStats> {
  const supabase = createAdminClient()
  const { from, to } = getDateRange(filters ?? {})

  function deliveryQuery() {
    const selectStr = filters?.vertical ? 'id, leads!inner(id)' : 'id'
    let q = supabase.from('deliveries').select(selectStr, { count: 'exact', head: true })
    if (filters?.broker_id) q = q.eq('broker_id', filters.broker_id)
    if (filters?.vertical) q = q.eq('leads.vertical', filters.vertical)
    return q
  }

  function leadQuery() {
    let q = supabase.from('leads').select('id', { count: 'exact', head: true })
    if (filters?.broker_id) q = q.eq('assigned_broker_id', filters.broker_id)
    if (filters?.vertical) q = q.eq('vertical', filters.vertical)
    return q
  }

  const [
    totalDeliveries,
    sentDeliveries,
    failedDeliveries,
    webhookTotal,
    emailTotal,
    smsTotal,
    webhookFailed,
    emailFailed,
    smsFailed,
    leadsReceived,
    leadsAssigned,
    leadsUnassigned,
  ] = await Promise.all([
    deliveryQuery().gte('created_at', from).lte('created_at', to),
    deliveryQuery().gte('created_at', from).lte('created_at', to).eq('status', 'sent'),
    deliveryQuery().gte('created_at', from).lte('created_at', to).in('status', ['failed', 'failed_permanent']),
    deliveryQuery().gte('created_at', from).lte('created_at', to).eq('channel', 'crm_webhook'),
    deliveryQuery().gte('created_at', from).lte('created_at', to).eq('channel', 'email'),
    deliveryQuery().gte('created_at', from).lte('created_at', to).eq('channel', 'sms'),
    deliveryQuery().gte('created_at', from).lte('created_at', to).eq('channel', 'crm_webhook').in('status', ['failed', 'failed_permanent']),
    deliveryQuery().gte('created_at', from).lte('created_at', to).eq('channel', 'email').in('status', ['failed', 'failed_permanent']),
    deliveryQuery().gte('created_at', from).lte('created_at', to).eq('channel', 'sms').in('status', ['failed', 'failed_permanent']),
    leadQuery().gte('created_at', from).lte('created_at', to),
    leadQuery().gte('created_at', from).lte('created_at', to).eq('status', 'assigned'),
    leadQuery().gte('created_at', from).lte('created_at', to).eq('status', 'unassigned'),
  ])

  return {
    leads: {
      received: leadsReceived.count ?? 0,
      assigned: leadsAssigned.count ?? 0,
      unassigned: leadsUnassigned.count ?? 0,
    },
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

export async function fetchRecentActivity(filters?: DashboardFilters, limit = 20) {
  const supabase = createAdminClient()

  let q = supabase
    .from('activity_log')
    .select(`
      id,
      event_type,
      details,
      created_at,
      broker_id,
      lead_id,
      order_id,
      brokers ( first_name, last_name ),
      leads ( first_name, last_name ),
      orders ( id )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters?.broker_id) q = q.eq('broker_id', filters.broker_id)

  const { from, to } = getDateRange(filters ?? {})
  q = q.gte('created_at', from).lte('created_at', to)

  const { data, error } = await q

  if (error) return []
  return data ?? []
}
