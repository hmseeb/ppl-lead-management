import { createAdminClient } from '@/lib/supabase/admin'
import { startOfDay, addDays, format, differenceInDays } from 'date-fns'
import type { DashboardFilters } from '@/lib/types/dashboard-filters'
import { getDateRange } from '@/lib/types/dashboard-filters'

export type CallKpis = {
  totalCalls: number
  transferred: number
  callbacksBooked: number
  noAnswer: number
  voicemail: number
}

export async function fetchCallKpis(filters?: DashboardFilters, brokerIds?: string[]): Promise<CallKpis> {
  const supabase = createAdminClient()
  const { from, to } = getDateRange(filters ?? {})

  function callQuery() {
    let q = supabase.from('call_logs').select('id', { count: 'exact', head: true })
    if (filters?.broker_id) q = q.eq('broker_id', filters.broker_id)
    if (brokerIds?.length) q = q.in('broker_id', brokerIds)
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

export type CallOutcomeVolume = {
  data: { date: string; label: string; transferred: number; callback_booked: number; no_answer: number; voicemail: number }[]
  bucketType: 'daily' | 'weekly'
  totalDays: number
}

export async function fetchCallOutcomeVolume(filters?: DashboardFilters, brokerIds?: string[]): Promise<CallOutcomeVolume> {
  const supabase = createAdminClient()
  const { from, to } = getDateRange(filters ?? {})
  const fromDate = startOfDay(new Date(from))
  const toDate = new Date(to)
  const totalDays = Math.max(1, differenceInDays(toDate, fromDate) + 1)
  const bucketType: 'daily' | 'weekly' = totalDays > 30 ? 'weekly' : 'daily'

  // Fetch all call_logs in range in a single query to avoid N+1
  let q = supabase
    .from('call_logs')
    .select('outcome, created_at')
    .gte('created_at', from)
    .lte('created_at', to)

  if (filters?.broker_id) q = q.eq('broker_id', filters.broker_id)
  if (brokerIds?.length) q = q.in('broker_id', brokerIds)

  const { data: rows } = await q

  // Bucket results in TypeScript
  const bucketMap = new Map<string, { transferred: number; callback_booked: number; no_answer: number; voicemail: number }>()

  for (const row of rows ?? []) {
    const rowDate = new Date(row.created_at)
    let bucketKey: string

    if (bucketType === 'daily') {
      bucketKey = format(startOfDay(rowDate), 'yyyy-MM-dd')
    } else {
      // Find which week bucket this falls into
      const daysSinceStart = differenceInDays(rowDate, fromDate)
      const weekIndex = Math.floor(daysSinceStart / 7)
      const weekStart = addDays(fromDate, weekIndex * 7)
      bucketKey = format(weekStart, 'yyyy-MM-dd')
    }

    const bucket = bucketMap.get(bucketKey) ?? { transferred: 0, callback_booked: 0, no_answer: 0, voicemail: 0 }

    switch (row.outcome) {
      case 'transferred': bucket.transferred++; break
      case 'callback_booked': bucket.callback_booked++; break
      case 'no_answer': bucket.no_answer++; break
      case 'voicemail': bucket.voicemail++; break
    }

    bucketMap.set(bucketKey, bucket)
  }

  // Build ordered bucket array
  const data: CallOutcomeVolume['data'] = []

  if (bucketType === 'daily') {
    const useShortLabel = totalDays <= 7
    for (let i = 0; i < totalDays; i++) {
      const day = addDays(fromDate, i)
      const key = format(day, 'yyyy-MM-dd')
      const bucket = bucketMap.get(key) ?? { transferred: 0, callback_booked: 0, no_answer: 0, voicemail: 0 }
      data.push({
        date: key,
        label: useShortLabel ? format(day, 'EEE') : format(day, 'MMM d'),
        ...bucket,
      })
    }
  } else {
    const weekCount = Math.ceil(totalDays / 7)
    for (let i = 0; i < weekCount; i++) {
      const weekStart = addDays(fromDate, i * 7)
      const key = format(weekStart, 'yyyy-MM-dd')
      const bucket = bucketMap.get(key) ?? { transferred: 0, callback_booked: 0, no_answer: 0, voicemail: 0 }
      data.push({
        date: key,
        label: format(weekStart, 'MMM d'),
        ...bucket,
      })
    }
  }

  return { data, bucketType, totalDays }
}

export type UpcomingCallback = {
  id: string
  scheduled_time: string
  status: string
  lead: { first_name: string | null; last_name: string | null } | null
  broker: { first_name: string; last_name: string } | null
}

export async function fetchUpcomingCallbacks(limit = 20): Promise<UpcomingCallback[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('callbacks')
    .select(`
      id,
      scheduled_time,
      status,
      leads ( first_name, last_name ),
      brokers ( first_name, last_name )
    `)
    .eq('status', 'pending')
    .gte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true })
    .limit(limit)

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.id,
    scheduled_time: row.scheduled_time,
    status: row.status,
    lead: row.leads,
    broker: row.brokers,
  }))
}
