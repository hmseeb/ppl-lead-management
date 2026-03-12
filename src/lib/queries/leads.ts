import { createAdminClient } from '@/lib/supabase/admin'

interface LeadFilters {
  search?: string
  status?: string
  vertical?: string
  broker_id?: string
  credit_score_min?: number
  credit_score_max?: number
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export async function fetchLeads(params: LeadFilters) {
  const supabase = createAdminClient()
  const page = params.page ?? 1
  const perPage = params.per_page ?? 50
  const offset = (page - 1) * perPage

  let query = supabase
    .from('leads')
    .select(`
      id, first_name, last_name, phone, email, vertical, credit_score,
      funding_amount, status, ai_call_status, created_at, assigned_at,
      assigned_broker_id, assigned_order_id,
      brokers!leads_assigned_broker_id_fkey ( first_name, last_name )
    `, { count: 'exact' })

  if (params.search) {
    query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,phone.ilike.%${params.search}%,email.ilike.%${params.search}%`)
  }
  if (params.status) query = query.eq('status', params.status)
  if (params.vertical) query = query.eq('vertical', params.vertical)
  if (params.broker_id) query = query.eq('assigned_broker_id', params.broker_id)
  if (params.credit_score_min) query = query.gte('credit_score', params.credit_score_min)
  if (params.credit_score_max) query = query.lte('credit_score', params.credit_score_max)
  if (params.date_from) query = query.gte('created_at', params.date_from)
  if (params.date_to) query = query.lte('created_at', `${params.date_to}T23:59:59.999Z`)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  return { data: data ?? [], count: count ?? 0, error }
}

export async function fetchBrokersForFilter() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('brokers')
    .select('id, first_name, last_name')
    .order('first_name')
  return data ?? []
}

export async function fetchLeadDetail(id: string) {
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from('leads')
    .select(`
      *,
      brokers!leads_assigned_broker_id_fkey ( id, first_name, last_name, company, email ),
      orders!leads_assigned_order_id_fkey ( id, verticals, total_leads, leads_delivered, status )
    `)
    .eq('id', id)
    .single()

  if (!lead) return null

  const [{ data: deliveries }, { data: activityLog }] = await Promise.all([
    supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('activity_log')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
  ])

  return { lead, deliveries: deliveries ?? [], activityLog: activityLog ?? [] }
}
