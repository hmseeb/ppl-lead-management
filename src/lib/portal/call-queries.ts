import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalDateRange } from '@/lib/types/portal-filters'
import type { PortalDateFilters } from '@/lib/types/portal-filters'
import { startOfDay, addDays, format, differenceInDays } from 'date-fns'

/**
 * Broker-scoped call reporting queries for the portal.
 *
 * Mirrors admin call-reporting.ts but always filters by broker_id
 * and uses portal date filter types.
 */

// ---- Types ----

export type PortalCallKpis = {
  totalCalls: number
  transferred: number
  callbacksBooked: number
  noAnswer: number
  voicemail: number
}

export type PortalCallOutcomeVolume = {
  data: {
    date: string
    label: string
    transferred: number
    callback_booked: number
    no_answer: number
    voicemail: number
  }[]
  bucketType: 'daily' | 'weekly'
  totalDays: number
}

export type PortalUpcomingCallback = {
  id: string
  scheduled_time: string
  status: string
  lead: { first_name: string | null; last_name: string | null } | null
}

// ---- Queries ----

export async function fetchPortalCallKpis(
  brokerId: string,
  dateFilters?: PortalDateFilters
): Promise<PortalCallKpis> {
  const supabase = createAdminClient()
  const { from, to } = getPortalDateRange(dateFilters ?? {})

  function callQuery() {
    return supabase
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', brokerId)
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

export async function fetchPortalCallOutcomeVolume(
  brokerId: string,
  dateFilters?: PortalDateFilters
): Promise<PortalCallOutcomeVolume> {
  const supabase = createAdminClient()
  const { from, to } = getPortalDateRange(dateFilters ?? {})
  const fromDate = startOfDay(new Date(from))
  const toDate = new Date(to)
  const totalDays = Math.max(1, differenceInDays(toDate, fromDate) + 1)
  const bucketType: 'daily' | 'weekly' = totalDays > 30 ? 'weekly' : 'daily'

  const { data: rows } = await supabase
    .from('call_logs')
    .select('outcome, created_at')
    .eq('broker_id', brokerId)
    .gte('created_at', from)
    .lte('created_at', to)

  // Bucket results in TypeScript
  const bucketMap = new Map<
    string,
    { transferred: number; callback_booked: number; no_answer: number; voicemail: number }
  >()

  for (const row of rows ?? []) {
    const rowDate = new Date(row.created_at)
    let bucketKey: string

    if (bucketType === 'daily') {
      bucketKey = format(startOfDay(rowDate), 'yyyy-MM-dd')
    } else {
      const daysSinceStart = differenceInDays(rowDate, fromDate)
      const weekIndex = Math.floor(daysSinceStart / 7)
      const weekStart = addDays(fromDate, weekIndex * 7)
      bucketKey = format(weekStart, 'yyyy-MM-dd')
    }

    const bucket = bucketMap.get(bucketKey) ?? {
      transferred: 0,
      callback_booked: 0,
      no_answer: 0,
      voicemail: 0,
    }

    switch (row.outcome) {
      case 'transferred':
        bucket.transferred++
        break
      case 'callback_booked':
        bucket.callback_booked++
        break
      case 'no_answer':
        bucket.no_answer++
        break
      case 'voicemail':
        bucket.voicemail++
        break
    }

    bucketMap.set(bucketKey, bucket)
  }

  // Build ordered bucket array
  const data: PortalCallOutcomeVolume['data'] = []

  if (bucketType === 'daily') {
    const useShortLabel = totalDays <= 7
    for (let i = 0; i < totalDays; i++) {
      const day = addDays(fromDate, i)
      const key = format(day, 'yyyy-MM-dd')
      const bucket = bucketMap.get(key) ?? {
        transferred: 0,
        callback_booked: 0,
        no_answer: 0,
        voicemail: 0,
      }
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
      const bucket = bucketMap.get(key) ?? {
        transferred: 0,
        callback_booked: 0,
        no_answer: 0,
        voicemail: 0,
      }
      data.push({
        date: key,
        label: format(weekStart, 'MMM d'),
        ...bucket,
      })
    }
  }

  return { data, bucketType, totalDays }
}

export async function fetchPortalUpcomingCallbacks(
  brokerId: string,
  limit = 10
): Promise<PortalUpcomingCallback[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('callbacks')
    .select('id, scheduled_time, status, leads ( first_name, last_name )')
    .eq('broker_id', brokerId)
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
  }))
}
