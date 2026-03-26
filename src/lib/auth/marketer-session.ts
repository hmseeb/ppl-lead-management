import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface MarketerSessionData {
  isMarketer: boolean
  marketerId: string
}

export const marketerSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'ppl-marketer-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
}

export async function getMarketerSession() {
  const cookieStore = await cookies()
  return getIronSession<MarketerSessionData>(cookieStore, marketerSessionOptions)
}
