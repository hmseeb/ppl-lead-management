'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createMarketerSessionFromEmail } from './actions'
import { Loader2 } from 'lucide-react'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient()

      // 1. Try implicit flow: parse hash fragment manually
      const hash = window.location.hash.substring(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (!error && data.session?.user?.email) {
            const result = await createMarketerSessionFromEmail(data.session.user.email)
            if (!('error' in result) || !result.error) {
              router.replace('/')
              return
            }
          }
          console.error('Implicit flow session failed:', error)
        }
      }

      // 2. Try PKCE flow: code in query params
      const code = searchParams.get('code')
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error && data.session?.user?.email) {
            const result = await createMarketerSessionFromEmail(data.session.user.email)
            if (!('error' in result) || !result.error) {
              router.replace('/')
              return
            }
          }
          console.error('PKCE code exchange failed:', error)
        } catch (err) {
          console.error('PKCE exchange error:', err)
        }
      }

      // Neither flow worked
      console.error('Auth callback: no valid session. Hash:', !!hash, 'Code:', !!code)
      router.replace('/marketer/login?error=invalid_link')
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-600/[0.04] dark:bg-red-600/[0.04] blur-[100px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="glass-card rounded-2xl p-8 glow-red">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.25)]">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-wide">PPL Lead Mgmt</h1>
              <p className="text-[10px] uppercase tracking-[0.15em] text-red-700/40 dark:text-red-400/50 font-medium">Marketer Access</p>
            </div>
          </div>
          <div className="text-center space-y-4">
            <div className="mx-auto size-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <Loader2 className="size-6 text-red-500 animate-spin" />
            </div>
            <div>
              <p className="font-medium">Verifying...</p>
              <p className="text-sm text-muted-foreground mt-1">Signing you into the dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MarketerAuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
