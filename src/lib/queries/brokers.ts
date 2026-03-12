import { createAdminClient } from '@/lib/supabase/admin'

export async function fetchBrokersWithStats() {
  const supabase = createAdminClient()
  const { data: brokers, error } = await supabase
    .from('brokers')
    .select(`
      id, first_name, last_name, company, email, phone, assignment_status, created_at,
      crm_webhook_url,
      orders ( id, status, leads_delivered, last_assigned_at )
    `)
    .order('created_at', { ascending: false })

  if (error || !brokers) return []

  return brokers.map((broker) => {
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
}

export async function fetchBrokerDetail(id: string) {
  const supabase = createAdminClient()

  const { data: broker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', id)
    .single()

  if (!broker) return null

  const [{ data: orders }, { data: leads }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, total_leads, leads_delivered, leads_remaining, verticals, credit_score_min, bonus_mode, created_at')
      .eq('broker_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('leads')
      .select(`
        id, first_name, last_name, vertical, credit_score, assigned_at, assigned_order_id, status,
        webhook_deliveries ( id, status )
      `)
      .eq('assigned_broker_id', id)
      .order('assigned_at', { ascending: false })
      .limit(100),
  ])

  return {
    broker,
    orders: orders ?? [],
    leads: leads ?? [],
  }
}
