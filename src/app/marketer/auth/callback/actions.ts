'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { marketerSessionOptions, MarketerSessionData } from '@/lib/auth/marketer-session'
import { sessionOptions, SessionData } from '@/lib/auth/session'
import { brokerSessionOptions, BrokerSessionData } from '@/lib/auth/broker-session'

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

  // Clear conflicting sessions
  const cookieStore = await cookies()
  const adminSession = await getIronSession<SessionData>(cookieStore, sessionOptions)
  adminSession.destroy()
  const brokerSession = await getIronSession<BrokerSessionData>(cookieStore, brokerSessionOptions)
  brokerSession.destroy()

  // Create marketer session
  const session = await getIronSession<MarketerSessionData>(cookieStore, marketerSessionOptions)
  session.isMarketer = true
  session.marketerId = marketer.id
  await session.save()

  return { success: true }
}
