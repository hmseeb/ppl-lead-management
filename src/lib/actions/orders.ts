'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { orderSchema } from '@/lib/schemas/order'

const VALID_STATUSES = ['active', 'paused', 'completed'] as const

export async function createOrder(data: unknown) {
  const result = orderSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { broker_id, total_leads, verticals, credit_score_min } = result.data

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      broker_id,
      total_leads,
      leads_remaining: total_leads,
      leads_delivered: 0,
      verticals: verticals as string[],
      credit_score_min,
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
    details: { total_leads, verticals, credit_score_min },
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

  revalidatePath('/orders')
  return { success: true }
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
