'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { marketerSessionOptions, MarketerSessionData } from '@/lib/auth/marketer-session'

export async function createMarketerSessionFromEmail(email: string) {
  const supabase = createAdminClient()

  // Look up marketer by verified email
  const { data: marketer, error } = await supabase
    .from('marketers')
    .select('id')
    .ilike('email', email)
    .single()

  if (error || !marketer) {
    return { error: 'no_marketer' }
  }

  // Create iron-session
  const cookieStore = await cookies()
  const session = await getIronSession<MarketerSessionData>(cookieStore, marketerSessionOptions)
  session.isMarketer = true
  session.marketerId = marketer.id
  await session.save()

  return { success: true }
}
