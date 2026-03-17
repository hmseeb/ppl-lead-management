import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Broker-scoped query helpers for the portal.
 *
 * Every function filters by brokerId so portal code can never
 * accidentally access another broker's data. Uses createAdminClient()
 * (service role) with explicit broker_id filters.
 *
 * RLS policies are a second layer of defense for any future
 * anon-key access paths.
 */

export async function getPortalBroker(brokerId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, email, phone, company_name, state, primary_vertical, secondary_vertical, timezone, assignment_status')
    .eq('id', brokerId)
    .single()

  if (error) return null
  return data
}

export async function getPortalLeads(
  brokerId: string,
  opts?: { limit?: number; offset?: number; status?: string }
) {
  const supabase = createAdminClient()
  let query = supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, business_name, vertical, credit_score, funding_amount, status, assigned_at, created_at', { count: 'exact' })
    .eq('assigned_broker_id', brokerId)
    .order('assigned_at', { ascending: false })

  if (opts?.status) {
    query = query.eq('status', opts.status)
  }

  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return { leads: [], count: 0 }
  return { leads: data ?? [], count: count ?? 0 }
}

export async function getPortalOrders(brokerId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, total_leads, leads_delivered, leads_remaining, verticals, credit_score_min, status, bonus_mode, order_type, priority, created_at, updated_at')
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function getPortalDeliveries(
  brokerId: string,
  opts?: { leadId?: string; limit?: number; offset?: number }
) {
  const supabase = createAdminClient()
  let query = supabase
    .from('deliveries')
    .select('id, lead_id, order_id, channel, status, error_message, retry_count, sent_at, created_at', { count: 'exact' })
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false })

  if (opts?.leadId) {
    query = query.eq('lead_id', opts.leadId)
  }

  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return { deliveries: [], count: 0 }
  return { deliveries: data ?? [], count: count ?? 0 }
}
