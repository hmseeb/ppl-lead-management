'use server'

import { createAdminClient } from '@/lib/supabase/admin'

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function sendMarketerMagicLink(email: string) {
  const supabase = createAdminClient()

  // Look up marketer by email (case-insensitive)
  const { data: marketer, error: lookupError } = await supabase
    .from('marketers')
    .select('id, email')
    .ilike('email', email)
    .single()

  if (lookupError || !marketer) {
    return { error: 'no_marketer' }
  }

  const redirectTo = `${getAppUrl()}/marketer/auth/callback`
  console.log('Marketer magic link emailRedirectTo:', redirectTo)

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: marketer.email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })

  if (otpError) {
    console.error('Failed to send marketer magic link:', JSON.stringify(otpError))
    return { error: 'email_failed', detail: otpError.message }
  }

  return { success: true }
}

export async function inviteMarketerToPortal(marketerId: string) {
  const supabase = createAdminClient()

  const { data: marketer, error } = await supabase
    .from('marketers')
    .select('email')
    .eq('id', marketerId)
    .single()

  if (error || !marketer) {
    return { error: 'Marketer not found' }
  }

  return sendMarketerMagicLink(marketer.email)
}

export async function requestMarketerMagicLink(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  // Always return success regardless of whether email was found (security)
  await sendMarketerMagicLink(email)
  return { success: true }
}
