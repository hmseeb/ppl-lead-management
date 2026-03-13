import { createAdminClient } from '@/lib/supabase/admin'
import { scoreLead, type OrderForScoring } from './scoring'

export interface AssignmentResult {
  status: 'assigned' | 'unassigned' | 'error'
  broker_id?: string
  order_id?: string
  delivery_ids?: string[]
  reason?: string
}

export async function assignLead(leadId: string): Promise<AssignmentResult> {
  const supabase = createAdminClient()

  // 1. Fetch lead data for scoring
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('credit_score, funding_amount, vertical')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    throw new Error(`Failed to fetch lead: ${leadError?.message ?? 'not found'}`)
  }

  // 2. Fetch candidate orders with broker assignment status
  const { data: rawOrders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id, broker_id, status, verticals, credit_score_min,
      leads_remaining, leads_delivered, total_leads, bonus_mode,
      loan_min, loan_max, priority,
      brokers!inner ( assignment_status )
    `)
    .eq('status', 'active')

  if (ordersError) {
    throw new Error(`Failed to fetch orders: ${ordersError.message}`)
  }

  // 3. Transform to scoring input format
  const orders: OrderForScoring[] = (rawOrders ?? []).map((o: any) => ({
    id: o.id,
    broker_id: o.broker_id,
    status: o.status,
    verticals: o.verticals,
    credit_score_min: o.credit_score_min,
    leads_remaining: o.leads_remaining,
    leads_delivered: o.leads_delivered,
    total_leads: o.total_leads,
    bonus_mode: o.bonus_mode,
    loan_min: o.loan_min,
    loan_max: o.loan_max,
    priority: o.priority,
    broker_assignment_status: o.brokers.assignment_status,
  }))

  // 4. Score all orders
  const scoredOrders = scoreLead(lead, orders)

  // 5. Call SQL function with winner (or without for unassigned path)
  if (scoredOrders.length > 0) {
    const { data, error } = await supabase.rpc('assign_lead', {
      p_lead_id: leadId,
      p_order_id: scoredOrders[0].order_id,
    })
    if (error) throw new Error(`Assignment failed: ${error.message}`)
    return data as unknown as AssignmentResult
  }

  // No eligible orders — let SQL handle unassigned path
  const { data, error } = await supabase.rpc('assign_lead', {
    p_lead_id: leadId,
  })
  if (error) throw new Error(`Assignment failed: ${error.message}`)
  return data as unknown as AssignmentResult
}
