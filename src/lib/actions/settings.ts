'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { settingsSchema } from '@/lib/schemas/settings'

export async function fetchSettings() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) return null
  return data
}

export async function updateSettings(formData: unknown) {
  const result = settingsSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()

  // Get the singleton row ID
  const { data: existing } = await supabase
    .from('admin_settings')
    .select('id')
    .limit(1)
    .single()

  if (!existing) {
    return { error: { _form: ['No settings row found'] } }
  }

  const { error } = await supabase
    .from('admin_settings')
    .update(result.data)
    .eq('id', existing.id)

  if (error) {
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/settings')
  return { success: true }
}
