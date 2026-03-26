'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { brokerSessionOptions, BrokerSessionData } from '@/lib/auth/broker-session'

export async function createBrokerSessionFromEmail(email: string) {
  const supabase = createAdminClient()

  // Look up broker by verified email
  const { data: broker, error } = await supabase
    .from('brokers')
    .select('id')
    .ilike('email', email)
    .single()

  if (error || !broker) {
    return { error: 'no_broker' }
  }

  // Create iron-session
  const cookieStore = await cookies()
  const session = await getIronSession<BrokerSessionData>(cookieStore, brokerSessionOptions)
  session.isBroker = true
  session.brokerId = broker.id
  await session.save()

  return { success: true }
}
