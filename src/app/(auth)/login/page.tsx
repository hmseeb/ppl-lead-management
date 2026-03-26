'use client'

import { useActionState, useEffect, useState } from 'react'
import { login } from '@/lib/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

function isMagicLinkHash() {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash
  return hash.includes('access_token') && hash.includes('type=magiclink')
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null)
  const [redirecting, setRedirecting] = useState(isMagicLinkHash)

  // Supabase magic link implicit flow redirects to root with hash fragment.
  // Middleware sends it here (/login). Catch it and forward to portal callback.
  useEffect(() => {
    if (redirecting) {
      window.location.href = '/portal/auth/callback' + window.location.hash
    }
  }, [redirecting])

  if (redirecting) {
    return (
      <div className="w-full max-w-sm">
        <div className="glass-card rounded-2xl p-8 glow-red text-center space-y-4">
          <Loader2 className="size-6 text-red-500 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      {/* Glass login card */}
      <div className="glass-card rounded-2xl p-8 glow-red">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.25)]">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-wide">PPL Lead Management</h1>
            <p className="text-[10px] uppercase tracking-[0.15em] text-red-700/40 dark:text-red-400/50 font-medium">Control Panel</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">Enter admin password to continue</p>

        <form action={formAction}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                required
                autoFocus
                className="glass-input h-10"
              />
            </div>
            {state?.error && (
              <div className="badge-glass-red rounded-lg px-3 py-2 text-xs">
                {state.error}
              </div>
            )}
            <Button type="submit" className="w-full h-10" disabled={pending}>
              {pending ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
