import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Old magic link verify route - deprecated in favor of Supabase Auth callback
  return NextResponse.redirect(
    new URL('/portal/login?error=invalid_link', request.url)
  )
}
