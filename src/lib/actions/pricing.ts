'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { pricingSchema } from '@/lib/schemas/pricing'

export async function fetchPrices() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('lead_prices')
    .select('*, brokers(id, first_name, last_name)')
    .order('vertical')
    .order('credit_tier_min')
    .order('broker_id', { nullsFirst: true })

  if (error) return []
  return data
}

export async function upsertPrice(formData: unknown) {
  const result = pricingSchema.safeParse(formData)
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { vertical, credit_tier_min, price_cents, broker_id } = result.data

  const { error } = await supabase
    .from('lead_prices')
    .upsert(
      {
        vertical,
        credit_tier_min,
        price_cents,
        broker_id: broker_id ?? null,
      },
      { onConflict: 'vertical,credit_tier_min,broker_id' }
    )

  if (error) {
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function updatePrice(id: string, priceCents: number) {
  if (!id || priceCents < 0) {
    return { error: 'Invalid price' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('lead_prices')
    .update({ price_cents: priceCents })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function deletePrice(id: string) {
  if (!id) return { error: 'Missing ID' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('lead_prices')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}
