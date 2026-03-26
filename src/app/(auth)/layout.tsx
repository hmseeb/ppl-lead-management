'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMagicLink, setIsMagicLink] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token') && hash.includes('type=magiclink')) {
      setIsMagicLink(true)
      const callback = localStorage.getItem('auth_callback') || '/portal/auth/callback'
      localStorage.removeItem('auth_callback')
      window.location.href = callback + hash
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Centered red glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-600/[0.04] dark:bg-red-600/[0.04] blur-[100px] pointer-events-none" />
      <div className="relative z-10">
        {isMagicLink ? (
          <div className="w-full max-w-sm">
            <div className="glass-card rounded-2xl p-8 glow-red text-center space-y-4">
              <Loader2 className="size-6 text-red-500 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Signing you in...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
