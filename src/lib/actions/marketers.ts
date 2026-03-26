'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createMarketer(data: {
  email: string
  first_name: string
  last_name: string
  phone?: string
}) {
  const supabase = createAdminClient()

  // Check email uniqueness
  const { data: existing } = await supabase
    .from('marketers')
    .select('id')
    .ilike('email', data.email)
    .single()

  if (existing) {
    return { error: 'A marketer with this email already exists' }
  }

  const { error } = await supabase
    .from('marketers')
    .insert({
      email: data.email.toLowerCase().trim(),
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone?.trim() || null,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/marketers')
  return { success: true }
}

export async function updateMarketer(id: string, data: {
  email: string
  first_name: string
  last_name: string
  phone?: string
  status: string
}) {
  const supabase = createAdminClient()

  // Check email uniqueness (excluding current marketer)
  const { data: existing } = await supabase
    .from('marketers')
    .select('id')
    .ilike('email', data.email)
    .neq('id', id)
    .single()

  if (existing) {
    return { error: 'A marketer with this email already exists' }
  }

  const { error } = await supabase
    .from('marketers')
    .update({
      email: data.email.toLowerCase().trim(),
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone?.trim() || null,
      status: data.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/marketers')
  return { success: true }
}

export async function deleteMarketer(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('marketers')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/marketers')
  return { success: true }
}

export async function assignBrokersToMarketer(marketerId: string, brokerIds: string[]) {
  const supabase = createAdminClient()

  // Delete all existing assignments
  const { error: deleteError } = await supabase
    .from('marketer_brokers')
    .delete()
    .eq('marketer_id', marketerId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  // Insert new assignments
  if (brokerIds.length > 0) {
    const { error: insertError } = await supabase
      .from('marketer_brokers')
      .insert(brokerIds.map(brokerId => ({
        marketer_id: marketerId,
        broker_id: brokerId,
      })))

    if (insertError) {
      return { error: insertError.message }
    }
  }

  revalidatePath('/marketers')
  return { success: true }
}
