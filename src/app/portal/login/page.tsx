'use client'

import { useActionState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { requestMagicLink } from '@/lib/actions/magic-link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

function LoginForm() {
  const [state, formAction, pending] = useActionState(requestMagicLink, null)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const emailRef = useRef('')

  const errorMessages: Record<string, string> = {
    missing_token: 'Invalid login link. Please request a new one.',
    invalid_link: 'This link has expired or already been used. Please request a new one.',
  }

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

          {error && errorMessages[error] && (
            <div className="badge-glass-red rounded-lg px-3 py-2 text-xs mb-4 flex items-center gap-2">
              <AlertCircle className="size-3.5 shrink-0" />
              {errorMessages[error]}
            </div>
          )}

          {state?.success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto size-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="size-6 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground mt-1">
                  If this email is associated with a broker account, you will receive a login link.
                </p>
              </div>
              <form action={formAction}>
                <input type="hidden" name="email" value={emailRef.current} />
                <Button type="submit" variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled={pending}>
                  {pending ? 'Sending...' : 'Resend link'}
                </Button>
              </form>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">Enter your email to receive a login link</p>

              <form action={(formData) => {
                emailRef.current = formData.get('email') as string
                formAction(formData)
              }}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
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
                    {pending ? (
                      'Sending...'
                    ) : (
                      <>
                        <Mail className="size-4 mr-2" />
                        Send Magic Link
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PortalLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
