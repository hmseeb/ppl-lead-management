import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface BrokerSessionData {
  isBroker: boolean
  brokerId: string
}

export const brokerSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'ppl-broker-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
}

export async function getBrokerSession() {
  const cookieStore = await cookies()
  return getIronSession<BrokerSessionData>(cookieStore, brokerSessionOptions)
}
