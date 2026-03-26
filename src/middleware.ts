import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/auth/session'
import { marketerSessionOptions, MarketerSessionData } from '@/lib/auth/marketer-session'

export async function middleware(request: NextRequest) {
  // If Supabase redirects to root with a code param, forward to portal auth callback
  const code = request.nextUrl.searchParams.get('code')
  if (code && request.nextUrl.pathname === '/') {
    const callbackUrl = new URL('/portal/auth/callback', request.url)
    callbackUrl.searchParams.set('code', code)
    return NextResponse.redirect(callbackUrl)
  }

  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  )

  if (!session.isLoggedIn) {
    // Check marketer session before redirecting
    const marketerSession = await getIronSession<MarketerSessionData>(
      request,
      response,
      marketerSessionOptions
    )
    if (!marketerSession.isMarketer) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!login|portal|marketer|api|_next/static|_next/image|favicon.ico).*)'],
}
