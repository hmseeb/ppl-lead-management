import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { verifyMagicLink } from '@/lib/actions/magic-link'
import { brokerSessionOptions, BrokerSessionData } from '@/lib/auth/broker-session'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/portal/login?error=missing_token', request.url))
  }

  const result = await verifyMagicLink(token)

  if ('error' in result) {
    return NextResponse.redirect(new URL('/portal/login?error=invalid_link', request.url))
  }

  // Create broker session on the response
  const response = NextResponse.redirect(new URL('/portal', request.url))
  const session = await getIronSession<BrokerSessionData>(request, response, brokerSessionOptions)
  session.isBroker = true
  session.brokerId = result.brokerId
  await session.save()

  return response
}
