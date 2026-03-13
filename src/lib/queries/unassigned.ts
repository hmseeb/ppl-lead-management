import { createAdminClient } from '@/lib/supabase/admin'

interface UnassignedFilters {
  search?: string
  reason?: string
  page?: number
  per_page?: number
}

export async function fetchUnassignedQueue(params: UnassignedFilters = {}) {
  const supabase = createAdminClient()
  const page = params.page ?? 1
  const perPage = params.per_page ?? 50
  const offset = (page - 1) * perPage

  let query = supabase
    .from('unassigned_queue')
    .select(`
      id, reason, details, created_at,
      leads ( id, first_name, last_name, vertical, credit_score, funding_amount, phone, email )
    `, { count: 'exact' })
    .eq('resolved', false)

  if (params.search) {
    query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`, { referencedTable: 'leads' })
  }
  if (params.reason) query = query.eq('reason', params.reason)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error) return { data: [], count: 0 }
  return { data: data ?? [], count: count ?? 0 }
}

export async function fetchActiveBrokersWithOrders() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('brokers')
    .select(`
      id, first_name, last_name, company,
      orders ( id, verticals, leads_remaining, status, bonus_mode )
    `)
    .eq('assignment_status', 'active')
    .order('first_name')

  if (error) return []
  return (data ?? []).map((broker) => ({
    ...broker,
    orders: ((broker.orders ?? []) as any[]).filter((o: any) => o.status === 'active'),
  }))
}
