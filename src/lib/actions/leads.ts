'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignLead } from '@/lib/assignment/assign'
import { getMarketerId, getMarketerBrokerIds } from '@/lib/auth/role'

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

export async function marketerReassignLead(
  leadIds: string[],
  targetBrokerId: string,
  targetOrderId: string
) {
  if (!leadIds.length) return { error: 'No leads selected' }
  if (!targetBrokerId || !targetOrderId) return { error: 'Target broker and order are required' }

  // 1. Verify marketer identity
  const marketerId = await getMarketerId()
  if (!marketerId) return { error: 'Unauthorized' }

  // 2. Get marketer's assigned broker IDs
  const marketerBrokerIds = await getMarketerBrokerIds()

  // 3. Validate target broker belongs to this marketer
  if (!marketerBrokerIds.includes(targetBrokerId)) {
    return { error: 'Target broker is not in your assignments' }
  }

  const supabase = createAdminClient()

  let reassigned = 0
  let failed = 0
  const results: {
    lead_id: string
    status: 'reassigned' | 'error'
    error?: string
  }[] = []

  for (const leadId of leadIds) {
    // 5a. Fetch the lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id, first_name, last_name, assigned_broker_id, assigned_order_id, status')
      .eq('id', leadId)
      .single()

    if (!lead) {
      results.push({ lead_id: leadId, status: 'error', error: 'Lead not found' })
      failed++
      continue
    }

    // 5b. Validate lead belongs to one of the marketer's brokers
    if (!lead.assigned_broker_id || !marketerBrokerIds.includes(lead.assigned_broker_id)) {
      results.push({ lead_id: leadId, status: 'error', error: 'Lead not assigned to your brokers' })
      failed++
      continue
    }

    // 5c. Validate not reassigning to same broker
    if (lead.assigned_broker_id === targetBrokerId) {
      results.push({ lead_id: leadId, status: 'error', error: 'Lead already assigned to this broker' })
      failed++
      continue
    }

    const originalBrokerId = lead.assigned_broker_id
    const originalOrderId = lead.assigned_order_id

    // 5e. Decrement original order counts
    if (originalOrderId) {
      const { data: origOrder } = await supabase
        .from('orders')
        .select('bonus_mode, leads_delivered, leads_remaining')
        .eq('id', originalOrderId)
        .single()

      if (origOrder) {
        const updates: { leads_delivered: number; leads_remaining?: number } = {
          leads_delivered: Math.max(0, origOrder.leads_delivered - 1),
        }
        if (!origOrder.bonus_mode) {
          updates.leads_remaining = origOrder.leads_remaining + 1
        }
        await supabase.from('orders').update(updates).eq('id', originalOrderId)
      }
    }

    // 5f. Update the lead to new broker/order
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        assigned_broker_id: targetBrokerId,
        assigned_order_id: targetOrderId,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
        rejection_reason: null,
      })
      .eq('id', leadId)

    if (updateError) {
      results.push({ lead_id: leadId, status: 'error', error: updateError.message })
      failed++
      continue
    }

    // 5g. Increment target order counts
    const { data: targetOrder } = await supabase
      .from('orders')
      .select('bonus_mode, leads_delivered, leads_remaining')
      .eq('id', targetOrderId)
      .single()

    if (targetOrder) {
      const updates: { leads_delivered: number; leads_remaining?: number } = {
        leads_delivered: targetOrder.leads_delivered + 1,
      }
      if (!targetOrder.bonus_mode) {
        updates.leads_remaining = Math.max(0, targetOrder.leads_remaining - 1)
      }
      await supabase.from('orders').update(updates).eq('id', targetOrderId)
    }

    // 5h. Log activity with marketer context
    await supabase.from('activity_log').insert({
      event_type: 'marketer_reassignment',
      broker_id: targetBrokerId,
      lead_id: leadId,
      order_id: targetOrderId,
      details: {
        marketer_id: marketerId,
        from_broker_id: originalBrokerId,
        from_order_id: originalOrderId,
        to_broker_id: targetBrokerId,
        to_order_id: targetOrderId,
      },
    })

    // 5i. Create webhook delivery if target broker has CRM URL
    const { data: broker } = await supabase
      .from('brokers')
      .select('crm_webhook_url')
      .eq('id', targetBrokerId)
      .single()

    if (broker?.crm_webhook_url) {
      const { data: fullLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (fullLead) {
        await supabase.from('deliveries').insert({
          lead_id: leadId,
          broker_id: targetBrokerId,
          order_id: targetOrderId,
          target_url: broker.crm_webhook_url,
          payload: fullLead as any,
          status: 'pending',
        })
      }
    }

    reassigned++
    results.push({ lead_id: leadId, status: 'reassigned' })
  }

  revalidatePath('/leads')
  revalidatePath('/brokers')
  revalidatePath('/orders')

  return {
    success: true,
    total: leadIds.length,
    reassigned,
    failed,
    results,
  }
}
