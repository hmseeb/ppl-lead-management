'use server'

import { getBrokerSession } from '@/lib/auth/broker-session'

export async function brokerLogout() {
  const session = await getBrokerSession()
  session.destroy()
}
