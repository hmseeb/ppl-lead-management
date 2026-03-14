'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { brokerSchema } from '@/lib/schemas/broker'

const VALID_STATUSES = ['active', 'paused', 'completed'] as const

export async function createBroker(data: unknown) {
  const result = brokerSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const {
    ghl_contact_id,
    first_name,
    last_name,
    email,
    phone,
    company_name,
    state,
    primary_vertical,
    secondary_vertical,
    batch_size,
    deal_amount,
    delivery_methods,
    crm_webhook_url,
    timezone,
    contact_hours,
    custom_hours_start,
    custom_hours_end,
    weekend_pause,
    assignment_status,
  } = result.data

  const { data: broker, error } = await supabase
    .from('brokers')
    .insert({
      ghl_contact_id,
      first_name,
      last_name,
      email: email.toLowerCase(),
      phone: phone || null,
      company_name: company_name || null,
      state: state || null,
      primary_vertical: primary_vertical || null,
      secondary_vertical: secondary_vertical || null,
      batch_size,
      deal_amount,
      token: `tok-${crypto.randomUUID()}`,
      assignment_status: assignment_status || 'active',
      status: 'completed',
      delivery_methods: delivery_methods?.length ? delivery_methods : ['crm_webhook'],
      crm_webhook_url: crm_webhook_url || null,
      timezone: timezone || null,
      contact_hours: contact_hours || 'anytime',
      custom_hours_start: custom_hours_start || null,
      custom_hours_end: custom_hours_end || null,
      weekend_pause: weekend_pause ?? false,
    })
    .select()
    .single()

  if (error) {
    return { error: { _form: [error.message] } }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    event_type: 'broker_created',
    broker_id: broker.id,
    details: { first_name, last_name, email },
  })

  revalidatePath('/brokers')
  return { success: true, broker }
}

export async function updateBroker(id: string, data: unknown) {
  const result = brokerSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const {
    ghl_contact_id,
    first_name,
    last_name,
    email,
    phone,
    company_name,
    state,
    primary_vertical,
    secondary_vertical,
    batch_size,
    deal_amount,
    delivery_methods,
    crm_webhook_url,
    timezone,
    contact_hours,
    custom_hours_start,
    custom_hours_end,
    weekend_pause,
    assignment_status,
  } = result.data

  const { error } = await supabase
    .from('brokers')
    .update({
      ghl_contact_id,
      first_name,
      last_name,
      email: email.toLowerCase(),
      phone: phone || null,
      company_name: company_name || null,
      state: state || null,
      primary_vertical: primary_vertical || null,
      secondary_vertical: secondary_vertical || null,
      batch_size,
      deal_amount,
      delivery_methods: delivery_methods?.length ? delivery_methods : ['crm_webhook'],
      crm_webhook_url: crm_webhook_url || null,
      timezone: timezone || null,
      contact_hours: contact_hours || 'anytime',
      custom_hours_start: contact_hours === 'custom' ? (custom_hours_start || null) : null,
      custom_hours_end: contact_hours === 'custom' ? (custom_hours_end || null) : null,
      weekend_pause: weekend_pause ?? false,
      assignment_status: assignment_status || 'active',
    })
    .eq('id', id)

  if (error) {
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/brokers')
  return { success: true }
}

export async function updateBrokerStatus(id: string, status: string) {
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: 'Invalid status. Must be active, paused, or completed.' }
  }

  const supabase = createAdminClient()

  // Get current status for activity log
  const { data: current } = await supabase
    .from('brokers')
    .select('assignment_status')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('brokers')
    .update({ assignment_status: status })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    event_type: 'broker_status_changed',
    broker_id: id,
    details: {
      old_status: current?.assignment_status,
      new_status: status,
    },
  })

  revalidatePath('/brokers')
  return { success: true }
}

export async function pauseAllBrokerOrders(brokerId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'paused' })
    .eq('broker_id', brokerId)
    .eq('status', 'active')

  if (error) return { error: error.message }
  revalidatePath('/brokers')
  revalidatePath('/orders')
  return { success: true }
}

export async function resumeAllBrokerOrders(brokerId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'active' })
    .eq('broker_id', brokerId)
    .eq('status', 'paused')

  if (error) return { error: error.message }
  revalidatePath('/brokers')
  revalidatePath('/orders')
  return { success: true }
}
