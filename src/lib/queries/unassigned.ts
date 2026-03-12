import { createAdminClient } from '@/lib/supabase/admin'

export async function fetchUnassignedQueue() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('unassigned_queue')
    .select(`
      id, reason, details, created_at,
      leads ( id, first_name, last_name, vertical, credit_score, funding_amount, phone, email )
    `)
    .eq('resolved', false)
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
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
