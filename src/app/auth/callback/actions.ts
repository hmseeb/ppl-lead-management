'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { marketerSessionOptions, MarketerSessionData } from '@/lib/auth/marketer-session'
import { brokerSessionOptions, BrokerSessionData } from '@/lib/auth/broker-session'
import { sessionOptions, SessionData } from '@/lib/auth/session'

export async function createSessionFromEmail(email: string): Promise<{ role: 'marketer' | 'broker'; error?: never } | { error: string; role?: never }> {
  const supabase = createAdminClient()
  const cookieStore = await cookies()

  // Check marketers first
  const { data: marketer } = await supabase
    .from('marketers')
    .select('id')
    .ilike('email', email)
    .eq('status', 'active')
    .single()

  if (marketer) {
    // Clear conflicting sessions
    const adminSession = await getIronSession<SessionData>(cookieStore, sessionOptions)
    adminSession.destroy()
    const brokerSession = await getIronSession<BrokerSessionData>(cookieStore, brokerSessionOptions)
    brokerSession.destroy()

    const session = await getIronSession<MarketerSessionData>(cookieStore, marketerSessionOptions)
    session.isMarketer = true
    session.marketerId = marketer.id
    await session.save()
    return { role: 'marketer' }
  }

  // Check brokers
  const { data: broker } = await supabase
    .from('brokers')
    .select('id')
    .ilike('email', email)
    .single()

  if (broker) {
    // Clear conflicting sessions
    const adminSession = await getIronSession<SessionData>(cookieStore, sessionOptions)
    adminSession.destroy()
    const marketerSession = await getIronSession<MarketerSessionData>(cookieStore, marketerSessionOptions)
    marketerSession.destroy()

    const session = await getIronSession<BrokerSessionData>(cookieStore, brokerSessionOptions)
    session.isBroker = true
    session.brokerId = broker.id
    await session.save()
    return { role: 'broker' }
  }

  return { error: 'no_account' }
}
