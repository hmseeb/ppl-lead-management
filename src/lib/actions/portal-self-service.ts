'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireBrokerSession, assertBrokerOwnsOrder } from '@/lib/portal/guard'
import { reassignUnassignedLeads } from '@/lib/assignment/reassign'
import { z } from 'zod'
import {
  DELIVERY_METHOD_OPTIONS,
  TIMEZONE_OPTIONS,
  CONTACT_HOURS_OPTIONS,
} from '@/lib/schemas/broker'

/* ------------------------------------------------------------------ */
/*  Order pause / resume                                               */
/* ------------------------------------------------------------------ */

export async function brokerPauseOrder(orderId: string) {
  const { brokerId } = await requireBrokerSession()
  await assertBrokerOwnsOrder(brokerId, orderId)

  const supabase = createAdminClient()

  // Only allow pausing active orders
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single()

  if (!order || order.status !== 'active') {
    return { error: 'Only active orders can be paused.' }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'paused' })
    .eq('id', orderId)

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    event_type: 'order_status_changed',
    broker_id: brokerId,
    order_id: orderId,
    details: { old_status: 'active', new_status: 'paused', source: 'broker_portal' },
  })

  revalidatePath('/portal')
  revalidatePath('/portal/orders')
  revalidatePath('/orders')
  return { success: true }
}

export async function brokerResumeOrder(orderId: string) {
  const { brokerId } = await requireBrokerSession()
  await assertBrokerOwnsOrder(brokerId, orderId)

  const supabase = createAdminClient()

  // Only allow resuming paused orders
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single()

  if (!order || order.status !== 'paused') {
    return { error: 'Only paused orders can be resumed.' }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'active' })
    .eq('id', orderId)

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    event_type: 'order_status_changed',
    broker_id: brokerId,
    order_id: orderId,
    details: { old_status: 'paused', new_status: 'active', source: 'broker_portal' },
  })

  // Trigger reassignment when order becomes active
  reassignUnassignedLeads().catch((err) => {
    console.error('Auto-reassignment after broker order resume failed:', err)
  })

  revalidatePath('/portal')
  revalidatePath('/portal/orders')
  revalidatePath('/orders')
  return { success: true }
}

/* ------------------------------------------------------------------ */
/*  Broker settings                                                    */
/* ------------------------------------------------------------------ */

const settingsSchema = z.object({
  delivery_methods: z.array(z.enum(DELIVERY_METHOD_OPTIONS)).min(1, 'Select at least one delivery method'),
  crm_webhook_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  delivery_email: z.string().email('Must be a valid email').or(z.literal('')).optional(),
  delivery_phone: z.string().min(7, 'Phone must be at least 7 characters').or(z.literal('')).optional(),
  timezone: z.enum(TIMEZONE_OPTIONS).or(z.literal('')).optional(),
  contact_hours: z.enum(CONTACT_HOURS_OPTIONS).optional(),
  custom_hours_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM format').or(z.literal('')).optional(),
  custom_hours_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM format').or(z.literal('')).optional(),
  weekend_pause: z.boolean().optional(),
})

export type BrokerSettingsInput = z.infer<typeof settingsSchema>

export async function updateBrokerSettings(data: unknown) {
  const { brokerId } = await requireBrokerSession()

  const result = settingsSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }

  const {
    delivery_methods,
    crm_webhook_url,
    delivery_email,
    delivery_phone,
    timezone,
    contact_hours,
    custom_hours_start,
    custom_hours_end,
    weekend_pause,
  } = result.data

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('brokers')
    .update({
      delivery_methods: delivery_methods.length ? delivery_methods : ['crm_webhook'],
      crm_webhook_url: crm_webhook_url || null,
      delivery_email: delivery_email || null,
      delivery_phone: delivery_phone || null,
      timezone: timezone || null,
      contact_hours: contact_hours || 'anytime',
      custom_hours_start: contact_hours === 'custom' ? (custom_hours_start || null) : null,
      custom_hours_end: contact_hours === 'custom' ? (custom_hours_end || null) : null,
      weekend_pause: weekend_pause ?? false,
    })
    .eq('id', brokerId)

  if (error) {
    return { error: { _form: [error.message] } }
  }

  await supabase.from('activity_log').insert({
    event_type: 'broker_settings_updated',
    broker_id: brokerId,
    details: { delivery_methods, contact_hours, timezone, source: 'broker_portal' },
  })

  revalidatePath('/portal')
  revalidatePath('/portal/settings')
  return { success: true }
}
