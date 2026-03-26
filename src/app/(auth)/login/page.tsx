'use client'

import { useActionState } from 'react'
import { login } from '@/lib/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null)

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
