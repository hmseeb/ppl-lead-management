import { createAdminClient } from '@/lib/supabase/admin'

interface OrderFilters {
  search?: string
  status?: string
  vertical?: string
  page?: number
  per_page?: number
}

export async function fetchOrdersWithBroker(params: OrderFilters = {}) {
  const supabase = createAdminClient()
  const page = params.page ?? 1
  const perPage = params.per_page ?? 50
  const offset = (page - 1) * perPage

  let query = supabase
    .from('orders')
    .select(`
      id, broker_id, total_leads, leads_delivered, leads_remaining,
      verticals, credit_score_min, status, bonus_mode, priority, order_type, loan_min, loan_max, created_at,
      brokers!inner ( first_name, last_name ),
      leads!leads_assigned_order_id_fkey ( count )
    `, { count: 'exact' })

  if (params.search) {
    query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`, { referencedTable: 'brokers' })
  }
  if (params.status) query = query.eq('status', params.status)
  if (params.vertical) query = query.contains('verticals', [params.vertical])

  const { data, count, error } = await query
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
      deliveries ( id, status )
    `)
    .eq('assigned_order_id', id)
    .order('assigned_at', { ascending: false })

  return { order, leads: leads ?? [] }
}
