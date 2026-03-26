import { createAdminClient } from '@/lib/supabase/admin'

interface MarketerFilters {
  search?: string
  status?: string
  page?: number
  per_page?: number
}

export async function fetchMarketers(params: MarketerFilters = {}) {
  const supabase = createAdminClient()
  const page = params.page ?? 1
  const perPage = params.per_page ?? 50
  const offset = (page - 1) * perPage

  let query = supabase
    .from('marketers')
    .select(`
      id, email, first_name, last_name, phone, status, created_at,
      marketer_brokers ( broker_id )
    `, { count: 'exact' })

  if (params.search) {
    query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`)
  }
  if (params.status) query = query.eq('status', params.status)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error || !data) return { data: [], count: 0 }

  const mapped = data.map((marketer) => ({
    ...marketer,
    broker_count: (marketer.marketer_brokers as any[])?.length ?? 0,
  }))

  return { data: mapped, count: count ?? 0 }
}

export async function fetchMarketerDetail(id: string) {
  const supabase = createAdminClient()

  const { data: marketer, error } = await supabase
    .from('marketers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !marketer) return null

  const { data: assignments } = await supabase
    .from('marketer_brokers')
    .select('broker_id, brokers ( id, first_name, last_name, company, email )')
    .eq('marketer_id', id)

  return {
    marketer,
    assignedBrokers: (assignments ?? []).map((a: any) => a.brokers),
  }
}

export async function fetchAllBrokersForAssignment() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, company')
    .order('first_name')
  return data ?? []
}
