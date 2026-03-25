import { createAdminClient } from '@/lib/supabase/admin'
import type { DashboardFilters } from '@/lib/types/dashboard-filters'
import { getDateRange } from '@/lib/types/dashboard-filters'

export type CallKpis = {
  totalCalls: number
  transferred: number
  callbacksBooked: number
  noAnswer: number
  voicemail: number
}

export async function fetchCallKpis(filters?: DashboardFilters): Promise<CallKpis> {
  const supabase = createAdminClient()
  const { from, to } = getDateRange(filters ?? {})

  function callQuery() {
    let q = supabase.from('call_logs').select('id', { count: 'exact', head: true })
    if (filters?.broker_id) q = q.eq('broker_id', filters.broker_id)
    return q
  }

  const [totalCalls, transferred, callbacksBooked, noAnswer, voicemail] =
    await Promise.all([
      callQuery().gte('created_at', from).lte('created_at', to),
      callQuery().gte('created_at', from).lte('created_at', to).eq('outcome', 'transferred'),
      callQuery().gte('created_at', from).lte('created_at', to).eq('outcome', 'callback_booked'),
      callQuery().gte('created_at', from).lte('created_at', to).eq('outcome', 'no_answer'),
      callQuery().gte('created_at', from).lte('created_at', to).eq('outcome', 'voicemail'),
    ])

  return {
    totalCalls: totalCalls.count ?? 0,
    transferred: transferred.count ?? 0,
    callbacksBooked: callbacksBooked.count ?? 0,
    noAnswer: noAnswer.count ?? 0,
    voicemail: voicemail.count ?? 0,
  }
}
