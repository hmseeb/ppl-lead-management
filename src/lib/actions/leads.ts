'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function manualAssignLead(leadId: string, brokerId: string, orderId: string) {
  if (!leadId || !brokerId || !orderId) {
    return { error: 'Lead ID, broker ID, and order ID are required' }
  }

  const supabase = createAdminClient()

  // Update lead
  const { error: leadError } = await supabase
    .from('leads')
    .update({
      assigned_broker_id: brokerId,
      assigned_order_id: orderId,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
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
