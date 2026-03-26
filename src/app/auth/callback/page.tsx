'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createSessionFromEmail } from './actions'
import { Loader2 } from 'lucide-react'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient()
      let email: string | null = null

      // 1. Try implicit flow: parse hash fragment
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
            email = data.session.user.email
          }
        }
      }

      // 2. Try PKCE flow: code in query params
      if (!email) {
        const code = searchParams.get('code')
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error && data.session?.user?.email) {
            email = data.session.user.email
          }
        }
      }

      if (!email) {
        router.replace('/login')
        return
      }

      // Determine role and create session
      const result = await createSessionFromEmail(email)

      if (result.error) {
        router.replace('/login')
        return
      }

      if (result.role === 'marketer') {
        router.replace('/')
      } else {
        router.replace('/portal')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-600/[0.04] dark:bg-red-600/[0.04] blur-[100px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="glass-card rounded-2xl p-8 glow-red text-center space-y-4">
          <Loader2 className="size-6 text-red-500 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    </div>
  )
}

export default function UniversalAuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
