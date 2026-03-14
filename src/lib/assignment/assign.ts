import { createAdminClient } from '@/lib/supabase/admin'
import { scoreLeadFull, type OrderForScoring } from './scoring'

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

  // 4. Score all orders (full results for audit trail)
  const auditResult = scoreLeadFull(lead, orders)
  const scoredOrders = auditResult.eligible

  // 5. Persist routing logs (fire-and-forget, never blocks assignment)
  if (auditResult.all.length > 0) {
    const winnerId = scoredOrders.length > 0 ? scoredOrders[0].order_id : null
    supabase.from('routing_logs').insert(
      auditResult.all.map((so) => ({
        lead_id: leadId,
        order_id: so.order_id,
        broker_id: so.broker_id,
        eligible: !so.disqualified,
        disqualify_reason: so.disqualify_reason ?? null,
        score_breakdown: so.score as any,
        total_score: so.score.total,
        fill_rate: so.fill_rate,
        selected: so.order_id === winnerId,
      }))
    ).then(({ error }) => {
      if (error) console.error('Failed to persist routing logs:', error.message)
    })
  }

  // 6. Call SQL function with winner (or without for unassigned path)
  if (scoredOrders.length > 0) {
    const { data, error } = await supabase.rpc('assign_lead', {
      p_lead_id: leadId,
      p_order_id: scoredOrders[0].order_id,
    })
    if (error) throw new Error(`Assignment failed: ${error.message}`)
    return data as unknown as AssignmentResult
  }

  // No eligible orders — pass null explicitly to avoid overload ambiguity
  const { data, error } = await supabase.rpc('assign_lead', {
    p_lead_id: leadId,
    p_order_id: null,
  })
  if (error) throw new Error(`Assignment failed: ${error.message}`)
  return data as unknown as AssignmentResult
}
