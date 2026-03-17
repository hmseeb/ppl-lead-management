'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut, LayoutDashboard, Package, Settings } from 'lucide-react'
import { brokerLogout } from '@/lib/actions/portal'

const NAV_ITEMS = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/orders', label: 'Orders', icon: Package },
  { href: '/portal/settings', label: 'Settings', icon: Settings },
] as const

export function PortalHeader({ brokerName }: { brokerName: string }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await brokerLogout()
    router.push('/portal/login')
  }

  function isActive(href: string) {
    if (href === '/portal') return pathname === '/portal'
    return pathname.startsWith(href)
  }

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-sm">PPL Portal</span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            ))}
          </nav>
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
