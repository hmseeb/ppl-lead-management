import { createAdminClient } from '@/lib/supabase/admin'

interface BrokerFilters {
  search?: string
  assignment_status?: string
  onboarding_status?: string
  broker_ids?: string[]
  page?: number
  per_page?: number
}

export async function fetchBrokersWithStats(params: BrokerFilters = {}) {
  const supabase = createAdminClient()
  const page = params.page ?? 1
  const perPage = params.per_page ?? 50
  const offset = (page - 1) * perPage

  let query = supabase
    .from('brokers')
    .select(`
      id, first_name, last_name, company, email, phone, assignment_status, status, created_at,
      crm_webhook_url, ghl_contact_id, delivery_methods,
      orders ( id, status, leads_delivered, last_assigned_at )
    `, { count: 'exact' })

  if (params.search) {
    query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,company.ilike.%${params.search}%`)
  }
  if (params.assignment_status) query = query.eq('assignment_status', params.assignment_status)
  if (params.onboarding_status) query = query.eq('status', params.onboarding_status)
  if (params.broker_ids?.length) query = query.in('id', params.broker_ids)

  const { data: brokers, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error || !brokers) return { data: [], count: 0 }

  const data = brokers.map((broker) => {
    const orders = (broker.orders ?? []) as { id: string; status: string; leads_delivered: number; last_assigned_at: string | null }[]
    return {
      ...broker,
      active_orders_count: orders.filter((o) => o.status === 'active').length,
      total_leads_delivered: orders.reduce((sum, o) => sum + o.leads_delivered, 0),
      last_delivery_date: orders.reduce((latest: string | null, o) => {
        if (!o.last_assigned_at) return latest
        if (!latest) return o.last_assigned_at
        return o.last_assigned_at > latest ? o.last_assigned_at : latest
      }, null),
    }
  })

  return { data, count: count ?? 0 }
}

export async function fetchBrokerDetail(id: string) {
  const supabase = createAdminClient()

  const { data: broker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', id)
    .single()

  if (!broker) return null

  const [{ data: orders }, { data: leads }, { data: queuedDeliveries }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, total_leads, leads_delivered, leads_remaining, verticals, credit_score_min, bonus_mode, created_at')
      .eq('broker_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('leads')
      .select(`
        id, first_name, last_name, vertical, credit_score, assigned_at, assigned_order_id, status,
        deliveries ( id, status )
      `)
      .eq('assigned_broker_id', id)
      .order('assigned_at', { ascending: false })
      .limit(100),
    supabase
      .from('deliveries')
      .select('id, channel, created_at, lead_id, leads ( first_name, last_name )')
      .eq('broker_id', id)
      .eq('status', 'queued')
      .order('created_at', { ascending: true }),
  ])

  return {
    broker,
    orders: orders ?? [],
    leads: leads ?? [],
    queuedDeliveries: queuedDeliveries ?? [],
  }
}
