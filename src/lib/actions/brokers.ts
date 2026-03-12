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
  const { name, company, email, phone, crm_webhook_url } = result.data

  // Split name into first/last for the existing brokers table schema
  const parts = name.trim().split(/\s+/)
  const first_name = parts[0]
  const last_name = parts.slice(1).join(' ') || ''

  const { data: broker, error } = await supabase
    .from('brokers')
    .insert({
      first_name,
      last_name,
      company,
      email,
      phone,
      crm_webhook_url,
      assignment_status: 'active',
      // Required fields from existing schema with sensible defaults
      ghl_contact_id: `manual-${Date.now()}`,
      token: `tok-${crypto.randomUUID()}`,
      batch_size: 1,
      deal_amount: 0,
      status: 'completed', // onboarding status (from ppl-onboarding)
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
    details: { name, email },
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
  const { name, company, email, phone, crm_webhook_url } = result.data

  const parts = name.trim().split(/\s+/)
  const first_name = parts[0]
  const last_name = parts.slice(1).join(' ') || ''

  const { error } = await supabase
    .from('brokers')
    .update({
      first_name,
      last_name,
      company,
      email,
      phone,
      crm_webhook_url,
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
