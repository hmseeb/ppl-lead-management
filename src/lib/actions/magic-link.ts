'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function sendMagicLink(email: string) {
  const supabase = createAdminClient()

  // Look up broker by email (case-insensitive)
  const { data: broker, error: lookupError } = await supabase
    .from('brokers')
    .select('id, first_name, email, ghl_contact_id')
    .ilike('email', email)
    .single()

  if (lookupError || !broker) {
    // Don't reveal whether email exists
    return { error: 'no_broker' }
  }

  // Generate token
  const token = crypto.randomUUID()

  // Insert magic link
  const { error: insertError } = await supabase.from('magic_links').insert({
    token,
    broker_id: broker.id,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  })

  if (insertError) {
    console.error('Failed to insert magic link:', insertError)
    return { error: 'insert_failed' }
  }

  // Build magic link URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const magicLinkUrl = `${baseUrl}/portal/auth/verify?token=${token}`

  // Send email via edge function (uses GHL for email delivery)
  const { error: fnError } = await supabase.functions.invoke('send-magic-link', {
    body: {
      to: broker.email,
      name: broker.first_name,
      link: magicLinkUrl,
      ghl_contact_id: broker.ghl_contact_id,
    },
  })

  if (fnError) {
    console.error('Failed to invoke send-magic-link function:', fnError)
    return { error: 'email_failed' }
  }

  return { success: true }
}

export async function verifyMagicLink(token: string) {
  const supabase = createAdminClient()

  // Query for valid, unused, non-expired token
  const { data: link, error } = await supabase
    .from('magic_links')
    .select('id, broker_id')
    .eq('token', token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !link) {
    return { error: 'invalid_or_expired' }
  }

  // Mark token as used
  await supabase
    .from('magic_links')
    .update({ used: true })
    .eq('id', link.id)

  return { brokerId: link.broker_id }
}

export async function requestMagicLink(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  // Always return success regardless of whether email was found (security)
  await sendMagicLink(email)
  return { success: true }
}

export async function inviteBrokerToPortal(brokerId: string) {
  const supabase = createAdminClient()

  const { data: broker, error } = await supabase
    .from('brokers')
    .select('email')
    .eq('id', brokerId)
    .single()

  if (error || !broker) {
    return { error: 'Broker not found' }
  }

  return sendMagicLink(broker.email)
}
