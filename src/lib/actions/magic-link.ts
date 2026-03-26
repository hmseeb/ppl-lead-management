'use server'

import { createAdminClient } from '@/lib/supabase/admin'

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function sendMagicLink(email: string) {
  const supabase = createAdminClient()

  // Look up broker by email (case-insensitive)
  const { data: broker, error: lookupError } = await supabase
    .from('brokers')
    .select('id, email')
    .ilike('email', email)
    .single()

  if (lookupError || !broker) {
    // Don't reveal whether email exists
    return { error: 'no_broker' }
  }

  const redirectTo = `${getAppUrl()}/portal/auth/callback`
  console.log('Magic link emailRedirectTo:', redirectTo)

  // Send magic link via Supabase Auth OTP
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: broker.email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })

  if (otpError) {
    console.error('Failed to send magic link via Supabase Auth:', otpError)
    return { error: 'email_failed' }
  }

  return { success: true }
}

export async function verifyMagicLink(_token: string) {
  console.warn('verifyMagicLink is deprecated. Use Supabase Auth callback flow instead.')
  return { error: 'deprecated' as const }
}

export async function requestMagicLink(
  _prevState: { error?: string; success?: boolean } | null,
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
