import { createAdminClient } from '@/lib/supabase/admin'

interface ActivityFilters {
  event_type?: string
  broker_id?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export async function fetchActivityLog(params: ActivityFilters) {
  const supabase = createAdminClient()
  const page = params.page ?? 1
  const perPage = params.per_page ?? 50
  const offset = (page - 1) * perPage

  let query = supabase
    .from('activity_log')
    .select(`
      id, event_type, details, created_at, broker_id, lead_id, order_id,
      brokers ( first_name, last_name ),
      leads ( first_name, last_name ),
      orders ( id )
    `, { count: 'exact' })

  if (params.event_type) query = query.eq('event_type', params.event_type)
  if (params.broker_id) query = query.eq('broker_id', params.broker_id)
  if (params.date_from) query = query.gte('created_at', params.date_from)
  if (params.date_to) query = query.lte('created_at', `${params.date_to}T23:59:59.999Z`)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  return { data: data ?? [], count: count ?? 0 }
}

export async function fetchEventTypes() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('activity_log')
    .select('event_type')

  if (!data) return []
  const unique = [...new Set(data.map((d) => d.event_type))]
  return unique.sort()
}

export async function fetchBrokersForActivityFilter() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('brokers')
    .select('id, first_name, last_name')
    .order('first_name')
  return data ?? []
}
