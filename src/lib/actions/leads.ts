'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignLead } from '@/lib/assignment/assign'

export async function manualAssignLead(leadId: string, brokerId: string, orderId: string) {
  if (!leadId || !brokerId || !orderId) {
    return { error: 'Lead ID, broker ID, and order ID are required' }
  }

  const supabase = createAdminClient()

  // Update lead (clear rejection_reason for previously rejected leads)
  const { error: leadError } = await supabase
    .from('leads')
    .update({
      assigned_broker_id: brokerId,
      assigned_order_id: orderId,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', leadId)

  if (leadError) return { error: leadError.message }

  // Get order to check bonus_mode
  const { data: order } = await supabase
    .from('orders')
    .select('bonus_mode, leads_remaining, leads_delivered')
    .eq('id', orderId)
    .single()

  if (order) {
    const updates: { leads_delivered: number; leads_remaining?: number } = {
      leads_delivered: order.leads_delivered + 1,
    }
    if (!order.bonus_mode) {
      updates.leads_remaining = Math.max(0, order.leads_remaining - 1)
    }
    await supabase.from('orders').update(updates).eq('id', orderId)
  }

  // Resolve unassigned queue entry
  await supabase
    .from('unassigned_queue')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('lead_id', leadId)

  // Log activity
  await supabase.from('activity_log').insert({
    event_type: 'manual_assignment',
    broker_id: brokerId,
    order_id: orderId,
    lead_id: leadId,
    details: { manual: true },
  })

  // Create webhook delivery record if broker has webhook URL
  const { data: broker } = await supabase
    .from('brokers')
    .select('crm_webhook_url')
    .eq('id', brokerId)
    .single()

  if (broker?.crm_webhook_url) {
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (lead) {
      await supabase.from('deliveries').insert({
        lead_id: leadId,
        broker_id: brokerId,
        order_id: orderId,
        target_url: broker.crm_webhook_url,
        payload: lead as any,
        status: 'pending',
      })
    }
  }

  revalidatePath('/unassigned')
  revalidatePath('/leads')
  revalidatePath('/orders')
  return { success: true }
}

export async function reassignLeads(leadIds: string[]) {
  if (!leadIds.length) return { error: 'No leads selected' }

  const supabase = createAdminClient()

  let reassigned = 0
  let failed = 0
  const results: {
    lead_id: string
    status: 'reassigned' | 'unassigned' | 'error'
    new_broker?: string
    error?: string
  }[] = []

  for (const leadId of leadIds) {
    // 1. Fetch current lead with assignment info
    const { data: lead } = await supabase
      .from('leads')
      .select('id, first_name, last_name, assigned_broker_id, assigned_order_id')
      .eq('id', leadId)
      .single()

    if (!lead) {
      results.push({ lead_id: leadId, status: 'error', error: 'not found' })
      failed++
      continue
    }

    const originalBrokerId = lead.assigned_broker_id
    const originalOrderId = lead.assigned_order_id

    // 2. Decrement original order's leads_delivered + increment leads_remaining
    if (originalOrderId) {
      const { data: order } = await supabase
        .from('orders')
        .select('bonus_mode, leads_delivered, leads_remaining')
        .eq('id', originalOrderId)
        .single()

      if (order) {
        const updates: { leads_delivered: number; leads_remaining?: number } = {
          leads_delivered: Math.max(0, order.leads_delivered - 1),
        }
        if (!order.bonus_mode) {
          updates.leads_remaining = order.leads_remaining + 1
        }
        await supabase.from('orders').update(updates).eq('id', originalOrderId)
      }
    }

    // 3. Clear assignment, set status to pending
    await supabase
      .from('leads')
      .update({
        assigned_broker_id: null,
        assigned_order_id: null,
        assigned_at: null,
        status: 'pending',
        rejection_reason: null,
      })
      .eq('id', leadId)

    // 4. Log the reassignment with original assignment details
    await supabase.from('activity_log').insert({
      event_type: 'lead_reassigned',
      lead_id: leadId,
      broker_id: originalBrokerId,
      order_id: originalOrderId,
      details: {
        original_broker_id: originalBrokerId,
        original_order_id: originalOrderId,
        action: 'bulk_reassign',
      },
    })

    // 5. Try to assign through routing engine
    try {
      const assignment = await assignLead(leadId)

      if (assignment.status === 'assigned') {
        reassigned++
        results.push({ lead_id: leadId, status: 'reassigned', new_broker: assignment.broker_id })
      } else {
        results.push({ lead_id: leadId, status: 'unassigned' })
      }
    } catch (err) {
      // If assignment fails, the lead stays as pending in the unassigned queue
      results.push({
        lead_id: leadId,
        status: 'unassigned',
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  revalidatePath('/leads')
  revalidatePath('/brokers')
  revalidatePath('/orders')
  revalidatePath('/unassigned')

  return {
    success: true,
    total: leadIds.length,
    reassigned,
    unassigned: leadIds.length - reassigned - failed,
    failed,
    results,
  }
}
