import { createAdminClient } from '@/lib/supabase/admin'
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns'

export async function fetchKpis() {
  const supabase = createAdminClient()
  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const monthStart = startOfMonth(now).toISOString()

  const [leadsToday, leadsWeek, leadsMonth, assigned, unassigned, activeBrokers, activeOrders, queued, rejectedToday, failedDeliveries, failedPermanentDeliveries] =
    await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'assigned'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'unassigned'),
      supabase.from('brokers').select('id', { count: 'exact', head: true }).eq('assignment_status', 'active'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('status', 'rejected'),
      supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('status', 'failed'),
      supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('status', 'failed_permanent'),
    ])

  const totalToday = leadsToday.count ?? 0
  const rejectedCount = rejectedToday.count ?? 0
  const rejectedRate = totalToday > 0 ? Math.round((rejectedCount / totalToday) * 100) : 0

  return {
    leadsToday: totalToday,
    leadsThisWeek: leadsWeek.count ?? 0,
    leadsThisMonth: leadsMonth.count ?? 0,
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

export async function fetchLeadVolume7Days() {
  const supabase = createAdminClient()
  const days: { date: string; label: string; count: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const day = subDays(new Date(), i)
    const dayStart = startOfDay(day).toISOString()
    const dayEnd = startOfDay(subDays(new Date(), i - 1)).toISOString()

    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayStart)
      .lt('created_at', i === 0 ? new Date().toISOString() : dayEnd)

    days.push({
      date: format(day, 'yyyy-MM-dd'),
      label: format(day, 'EEE'),
      count: count ?? 0,
    })
  }

  return days
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

export async function fetchDeliveryStats(): Promise<DeliveryStats> {
  const supabase = createAdminClient()
  const todayStart = startOfDay(new Date()).toISOString()

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
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('status', 'sent'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('channel', 'crm_webhook'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('channel', 'email'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('channel', 'sms'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('channel', 'crm_webhook').in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('channel', 'email').in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('channel', 'sms').in('status', ['failed', 'failed_permanent']),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('status', 'assigned'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).eq('status', 'unassigned'),
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

export async function fetchRecentActivity(limit = 20) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
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

  if (error) return []
  return data ?? []
}
