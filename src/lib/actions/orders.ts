'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { orderSchema } from '@/lib/schemas/order'
import { reassignUnassignedLeads } from '@/lib/assignment/reassign'

const VALID_STATUSES = ['active', 'paused', 'completed'] as const

export async function createOrder(data: unknown) {
  const result = orderSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { broker_id, total_leads, verticals, credit_score_min, loan_min, loan_max, priority, order_type } = result.data

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      broker_id,
      total_leads,
      leads_remaining: total_leads,
      leads_delivered: 0,
      verticals: verticals as string[],
      credit_score_min,
      loan_min,
      loan_max,
      priority,
      order_type,
      status: 'active',
      bonus_mode: false,
    })
    .select()
    .single()

  if (error) {
    return { error: { _form: [error.message] } }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    event_type: 'order_created',
    broker_id,
    order_id: order.id,
    details: { total_leads, verticals, credit_score_min, loan_min, loan_max, priority, order_type },
  })

  // Auto-reassign unassigned leads that may match this new order
  reassignUnassignedLeads().catch((err) => {
    console.error('Auto-reassignment after order creation failed:', err)
  })

  revalidatePath('/orders')
  return { success: true, order }
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    return { error: 'Invalid status. Must be active, paused, or completed.' }
  }

  const supabase = createAdminClient()

  // Get current order for activity log
  const { data: current } = await supabase
    .from('orders')
    .select('status, broker_id')
    .eq('id', orderId)
    .single()

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (error) {
    return { error: error.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    event_type: 'order_status_changed',
    broker_id: current?.broker_id,
    order_id: orderId,
    details: {
      old_status: current?.status,
      new_status: newStatus,
    },
  })

  // Auto-reassign unassigned leads when an order becomes active (activate or unpause)
  if (newStatus === 'active') {
    reassignUnassignedLeads().catch((err) => {
      console.error('Auto-reassignment after order activation failed:', err)
    })
  }

  revalidatePath('/orders')
  return { success: true }
}

export async function updateOrder(orderId: string, data: unknown) {
  const result = orderSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { broker_id, total_leads, verticals, credit_score_min, loan_min, loan_max, priority, order_type } = result.data

  // Ensure total_leads isn't less than already delivered
  const { data: current } = await supabase
    .from('orders')
    .select('leads_delivered, broker_id')
    .eq('id', orderId)
    .single()

  if (!current) {
    return { error: { _form: ['Order not found'] } }
  }

  if (total_leads < current.leads_delivered) {
    return { error: { _form: [`Total leads cannot be less than already delivered (${current.leads_delivered})`] } }
  }

  const leads_remaining = total_leads - current.leads_delivered

  const { error } = await supabase
    .from('orders')
    .update({
      broker_id,
      total_leads,
      leads_remaining,
      verticals: verticals as string[],
      credit_score_min,
      loan_min,
      loan_max,
      priority,
      order_type,
    })
    .eq('id', orderId)

  if (error) {
    return { error: { _form: [error.message] } }
  }

  await supabase.from('activity_log').insert({
    event_type: 'order_updated',
    broker_id,
    order_id: orderId,
    details: { total_leads, verticals, credit_score_min, loan_min, loan_max, priority, order_type },
  })

  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
  return { success: true }
}

export async function reorderOrder(orderId: string) {
  const supabase = createAdminClient()

  const { data: original } = await supabase
    .from('orders')
    .select('broker_id, total_leads, verticals, credit_score_min, loan_min, loan_max, priority, order_type')
    .eq('id', orderId)
    .single()

  if (!original) {
    return { error: 'Original order not found' }
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      broker_id: original.broker_id,
      total_leads: original.total_leads,
      leads_remaining: original.total_leads,
      leads_delivered: 0,
      verticals: original.verticals,
      credit_score_min: original.credit_score_min,
      loan_min: original.loan_min,
      loan_max: original.loan_max,
      priority: original.priority,
      order_type: original.order_type,
      status: 'active',
      bonus_mode: false,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  await supabase.from('activity_log').insert({
    event_type: 'order_created',
    broker_id: original.broker_id,
    order_id: order.id,
    details: {
      total_leads: original.total_leads,
      verticals: original.verticals,
      credit_score_min: original.credit_score_min,
      loan_min: original.loan_min,
      loan_max: original.loan_max,
      priority: original.priority,
      order_type: original.order_type,
      reordered_from: orderId,
    },
  })

  reassignUnassignedLeads().catch((err) => {
    console.error('Auto-reassignment after reorder failed:', err)
  })

  revalidatePath('/orders')
  return { success: true, order }
}

export async function toggleBonusMode(orderId: string) {
  const supabase = createAdminClient()

  // Fetch current bonus_mode
  const { data: current } = await supabase
    .from('orders')
    .select('bonus_mode, broker_id')
    .eq('id', orderId)
    .single()

  if (!current) {
    return { error: 'Order not found' }
  }

  const newBonusMode = !current.bonus_mode

  const { error } = await supabase
    .from('orders')
    .update({ bonus_mode: newBonusMode })
    .eq('id', orderId)

  if (error) {
    return { error: error.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    event_type: 'bonus_mode_toggled',
    broker_id: current.broker_id,
    order_id: orderId,
    details: { bonus_mode: newBonusMode },
  })

  revalidatePath('/orders')
  return { success: true, bonus_mode: newBonusMode }
}
