'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { startOfDay } from 'date-fns'

export type KpiPreviewType =
  | 'leads_today'
  | 'assigned'
  | 'unassigned'
  | 'active_brokers'
  | 'active_orders'
  | 'queued'

export async function fetchLeadsTodayPreview() {
  try {
    const supabase = createAdminClient()
    const todayStart = startOfDay(new Date()).toISOString()

    const { data } = await supabase
      .from('leads')
      .select('id, first_name, last_name, phone, vertical, credit_score, status, created_at')
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false })
      .limit(8)

    return data ?? []
  } catch {
    return []
  }
}

export async function fetchAssignedPreview() {
  try {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, vertical, credit_score, assigned_at,
        brokers!leads_assigned_broker_id_fkey ( first_name, last_name )
      `)
      .eq('status', 'assigned')
      .order('assigned_at', { ascending: false })
      .limit(8)

    return data ?? []
  } catch {
    return []
  }
}

export async function fetchUnassignedPreview() {
  try {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('unassigned_queue')
      .select(`
        id, reason, created_at,
        leads!inner ( id, first_name, last_name, vertical, credit_score, created_at )
      `)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(8)

    return data ?? []
  } catch {
    return []
  }
}

export async function fetchActiveBrokersPreview() {
  try {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('brokers')
      .select('id, first_name, last_name, company, email, assignment_status')
      .eq('assignment_status', 'active')
      .order('first_name', { ascending: true })
      .limit(8)

    return data ?? []
  } catch {
    return []
  }
}

export async function fetchActiveOrdersPreview() {
  try {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('orders')
      .select(`
        id, broker_id, total_leads, leads_delivered, leads_remaining, verticals, status,
        brokers!inner ( first_name, last_name )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8)

    return data ?? []
  } catch {
    return []
  }
}

export async function fetchQueuedPreview() {
  try {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('deliveries')
      .select(`
        id, channel, status, created_at, broker_id, lead_id,
        brokers ( first_name, last_name ),
        leads ( first_name, last_name )
      `)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(8)

    return data ?? []
  } catch {
    return []
  }
}
