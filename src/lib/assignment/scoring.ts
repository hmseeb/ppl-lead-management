/**
 * Lead Scoring Engine
 * Pure TypeScript module — no DB calls, no side effects.
 * Replaces SQL ORDER BY weighted rotation with 0-100 scoring algorithm.
 */

export interface LeadForScoring {
  credit_score: number | null
  funding_amount: number | null
  vertical: string | null
}

export interface OrderForScoring {
  id: string
  broker_id: string
  status: string
  verticals: string[]
  credit_score_min: number | null
  leads_remaining: number
  leads_delivered: number
  total_leads: number
  bonus_mode: boolean
  loan_min: number | null
  loan_max: number | null
  priority: string // 'high' | 'normal'
  broker_assignment_status: string
}

export interface ScoreBreakdown {
  credit_fit: number
  capacity: number
  tier_match: number
  loan_fit: number
  priority_bonus: number
  urgency_bonus: number
  total: number
}

export interface ScoredOrder {
  order_id: string
  broker_id: string
  score: ScoreBreakdown
  fill_rate: number
  disqualified: boolean
  disqualify_reason?: string
}

// ---- Hard Filters ----

function passesHardFilters(
  lead: LeadForScoring,
  order: OrderForScoring
): { eligible: boolean; reason?: string } {
  // Must be active
  if (order.status !== 'active') return { eligible: false, reason: 'order_not_active' }
  if (order.broker_assignment_status !== 'active') return { eligible: false, reason: 'broker_not_active' }

  // Capacity check
  if (order.leads_remaining <= 0 && !order.bonus_mode) return { eligible: false, reason: 'no_capacity' }

  // Vertical match
  if (lead.vertical) {
    const matches = order.verticals.includes(lead.vertical) || order.verticals.includes('All')
    if (!matches) return { eligible: false, reason: 'vertical_mismatch' }
  }

  // TIER-01: 680+ orders NEVER receive leads with credit < 680
  if (order.credit_score_min !== null && order.credit_score_min >= 680) {
    if (lead.credit_score === null || lead.credit_score < 680) {
      return { eligible: false, reason: 'credit_tier_680_gate' }
    }
  }

  // TIER-02: 600+ orders reject leads with credit < 600
  if (order.credit_score_min !== null && order.credit_score_min >= 600) {
    if (lead.credit_score === null || lead.credit_score < order.credit_score_min) {
      return { eligible: false, reason: 'credit_below_minimum' }
    }
  }

  // ORDER-05: Loan range hard filter
  if (lead.funding_amount !== null && lead.funding_amount !== undefined) {
    if (order.loan_min !== null && lead.funding_amount < order.loan_min) {
      return { eligible: false, reason: 'loan_below_minimum' }
    }
    if (order.loan_max !== null && lead.funding_amount > order.loan_max) {
      return { eligible: false, reason: 'loan_above_maximum' }
    }
  }

  return { eligible: true }
}

// ---- Scoring Components ----

/** SCORE-02: Credit Fit (max 40pts) */
function creditFitScore(lead: LeadForScoring, order: OrderForScoring): number {
  if (lead.credit_score === null) return 0
  if (order.credit_score_min === null) return 40
  const range = 850 - order.credit_score_min
  if (range <= 0) return 0
  const raw = ((lead.credit_score - order.credit_score_min) / range) * 40
  return Math.max(0, Math.min(40, raw))
}

/** SCORE-03: Capacity (max 30pts) */
function capacityScore(order: OrderForScoring): number {
  const fillRate = order.total_leads > 0 ? order.leads_delivered / order.total_leads : 0
  return (1 - fillRate) * 30
}

/** SCORE-04: Tier Match (max 20pts) */
function tierMatchScore(lead: LeadForScoring, order: OrderForScoring): number {
  if (lead.credit_score === null || order.credit_score_min === null) return 0

  const isHighTierLead = lead.credit_score >= 680
  const isHighTierOrder = order.credit_score_min >= 680
  const isLowTierOrder = order.credit_score_min >= 600 && order.credit_score_min < 680

  // Exact match: 680+ lead to 680-min order, or 600-679 lead to 600-min order
  if (isHighTierLead && isHighTierOrder) return 20
  if (!isHighTierLead && lead.credit_score >= 600 && isLowTierOrder) return 20

  // Fallback: 680+ lead to 600-min order
  if (isHighTierLead && isLowTierOrder) return 10

  return 0
}

/** SCORE-05: Loan Fit (max 10pts) */
function loanFitScore(lead: LeadForScoring, order: OrderForScoring): number {
  if (order.loan_min === null && order.loan_max === null) return 10
  if (lead.funding_amount === null) return 0

  const aboveMin = order.loan_min === null || lead.funding_amount >= order.loan_min
  const belowMax = order.loan_max === null || lead.funding_amount <= order.loan_max
  return aboveMin && belowMax ? 10 : 0
}

/** SCORE-06: Priority Bonus (+8pts for high) */
function priorityBonus(order: OrderForScoring): number {
  return order.priority === 'high' ? 8 : 0
}

/** SCORE-07: Urgency Bonus (+5 when fill > 80%, -5 when fill < 10%) */
function urgencyBonus(order: OrderForScoring): number {
  const fillRate = order.total_leads > 0 ? order.leads_delivered / order.total_leads : 0
  if (fillRate > 0.8) return 5
  if (fillRate < 0.1) return -5
  return 0
}

// ---- Main Scoring Function ----

export function scoreLead(
  lead: LeadForScoring,
  orders: OrderForScoring[]
): ScoredOrder[] {
  const results: ScoredOrder[] = []

  for (const order of orders) {
    const fillRate = order.total_leads > 0 ? order.leads_delivered / order.total_leads : 0
    const filterResult = passesHardFilters(lead, order)

    if (!filterResult.eligible) {
      results.push({
        order_id: order.id,
        broker_id: order.broker_id,
        fill_rate: fillRate,
        disqualified: true,
        disqualify_reason: filterResult.reason,
        score: { credit_fit: 0, capacity: 0, tier_match: 0, loan_fit: 0, priority_bonus: 0, urgency_bonus: 0, total: 0 },
      })
      continue
    }

    const credit_fit = creditFitScore(lead, order)
    const capacity = capacityScore(order)
    const tier_match = tierMatchScore(lead, order)
    const loan_fit = loanFitScore(lead, order)
    const priority = priorityBonus(order)
    const urgency = urgencyBonus(order)
    const total = credit_fit + capacity + tier_match + loan_fit + priority + urgency

    results.push({
      order_id: order.id,
      broker_id: order.broker_id,
      fill_rate: fillRate,
      disqualified: false,
      score: { credit_fit, capacity, tier_match, loan_fit, priority_bonus: priority, urgency_bonus: urgency, total },
    })
  }

  // Sort: eligible first, then by score DESC, then fill_rate ASC (tie-breaker SCORE-08)
  const eligible = results
    .filter((r) => !r.disqualified)
    .sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total
      return a.fill_rate - b.fill_rate // lower fill_rate wins
    })

  return eligible
}
