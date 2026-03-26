'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { DashboardFilters } from '@/lib/types/dashboard-filters'
import { getDateRange } from '@/lib/types/dashboard-filters'

export type CallPreviewType =
  | 'total_calls'
  | 'transferred'
  | 'callbacks_booked'
  | 'no_answer'
  | 'voicemail'

export async function fetchCallPreview(
  type: CallPreviewType,
  filters?: DashboardFilters
) {
  try {
    const supabase = createAdminClient()
    const { from, to } = getDateRange(filters ?? {})

    let q = supabase
      .from('call_logs')
      .select(`
        id, outcome, duration, notes, created_at,
        leads ( first_name, last_name ),
        brokers ( first_name, last_name )
      `)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false })
      .limit(8)

    if (filters?.broker_id) q = q.eq('broker_id', filters.broker_id)

    if (type !== 'total_calls') {
      const outcomeMap: Record<string, string> = {
        transferred: 'transferred',
        callbacks_booked: 'callback_booked',
        no_answer: 'no_answer',
        voicemail: 'voicemail',
      }
      q = q.eq('outcome', outcomeMap[type])
    }

    const { data } = await q
    return data ?? []
  } catch {
    return []
  }
}
