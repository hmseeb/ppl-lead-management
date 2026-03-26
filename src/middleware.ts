import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/auth/session'
import { marketerSessionOptions, MarketerSessionData } from '@/lib/auth/marketer-session'

export async function middleware(request: NextRequest) {
  // If Supabase redirects to root with a code param, check cookie for intended callback
  const code = request.nextUrl.searchParams.get('code')
  if (code && request.nextUrl.pathname === '/') {
    const authCallback = request.cookies.get('auth_callback')?.value || '/portal/auth/callback'
    const callbackUrl = new URL(authCallback, request.url)
    callbackUrl.searchParams.set('code', code)
    const response = NextResponse.redirect(callbackUrl)
    response.cookies.delete('auth_callback')
    return response
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
  matcher: ['/((?!login|auth/|portal|marketer/|api|_next/static|_next/image|favicon.ico).*)'],
}
