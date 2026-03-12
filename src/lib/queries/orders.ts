import { createAdminClient } from '@/lib/supabase/admin'

interface OrderFilters {
  page?: number
  per_page?: number
}

export async function fetchOrdersWithBroker(params: OrderFilters = {}) {
  const supabase = createAdminClient()
  const page = params.page ?? 1
  const perPage = params.per_page ?? 50
  const offset = (page - 1) * perPage

  const { data, count, error } = await supabase
    .from('orders')
    .select(`
      id, broker_id, total_leads, leads_delivered, leads_remaining,
      verticals, credit_score_min, status, bonus_mode, created_at,
      brokers!inner ( first_name, last_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error) return { data: [], count: 0 }
  return { data: data ?? [], count: count ?? 0 }
}

export async function fetchOrderDetail(id: string) {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      brokers!inner ( id, first_name, last_name, company )
    `)
    .eq('id', id)
    .single()

  if (!order) return null

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      id, first_name, last_name, vertical, credit_score, assigned_at, status,
      webhook_deliveries ( id, status )
    `)
    .eq('assigned_order_id', id)
    .order('assigned_at', { ascending: false })

  return { order, leads: leads ?? [] }
}
