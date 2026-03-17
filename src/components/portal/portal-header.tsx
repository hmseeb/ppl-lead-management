'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { brokerLogout } from '@/lib/actions/portal'

export function PortalHeader({ brokerName }: { brokerName: string }) {
  const router = useRouter()

  async function handleLogout() {
    await brokerLogout()
    router.push('/portal/login')
  }

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-sm">PPL Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{brokerName}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-4 mr-1" /> Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
