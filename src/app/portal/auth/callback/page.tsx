'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createBrokerSessionFromEmail } from './actions'
import { Loader2 } from 'lucide-react'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code')

      if (!code) {
        router.replace('/portal/login?error=invalid_link')
        return
      }

      try {
        const supabase = createClient()
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError || !data.session?.user?.email) {
          console.error('Code exchange failed:', exchangeError)
          router.replace('/portal/login?error=invalid_link')
          return
        }

        const result = await createBrokerSessionFromEmail(data.session.user.email)

        if ('error' in result && result.error) {
          console.error('Session creation failed:', result.error)
          router.replace('/portal/login?error=invalid_link')
          return
        }

        router.replace('/portal')
      } catch (err) {
        console.error('Callback error:', err)
        router.replace('/portal/login?error=invalid_link')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Centered glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-600/[0.04] dark:bg-red-600/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="glass-card rounded-2xl p-8 glow-red">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.25)]">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-wide">PPL Portal</h1>
              <p className="text-[10px] uppercase tracking-[0.15em] text-red-700/40 dark:text-red-400/50 font-medium">Broker Access</p>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto size-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <Loader2 className="size-6 text-red-500 animate-spin" />
            </div>
            <div>
              <p className="font-medium">Verifying...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Signing you into the portal
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
