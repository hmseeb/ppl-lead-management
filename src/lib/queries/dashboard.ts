import { createAdminClient } from '@/lib/supabase/admin'
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns'

export async function fetchKpis() {
  const supabase = createAdminClient()
  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const monthStart = startOfMonth(now).toISOString()

  const [leadsToday, leadsWeek, leadsMonth, assigned, unassigned, activeBrokers, activeOrders] =
    await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'assigned'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'unassigned'),
      supabase.from('brokers').select('id', { count: 'exact', head: true }).eq('assignment_status', 'active'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ])

  return {
    leadsToday: leadsToday.count ?? 0,
    leadsThisWeek: leadsWeek.count ?? 0,
    leadsThisMonth: leadsMonth.count ?? 0,
    assignedCount: assigned.count ?? 0,
    unassignedCount: unassigned.count ?? 0,
    activeBrokers: activeBrokers.count ?? 0,
    activeOrders: activeOrders.count ?? 0,
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
