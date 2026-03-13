'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard, Users, ShoppingCart, FileText,
  AlertCircle, Activity, LogOut,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: FileText },
  { href: '/brokers', label: 'Brokers', icon: Users },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/unassigned', label: 'Unassigned', icon: AlertCircle },
  { href: '/activity', label: 'Activity', icon: Activity },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 glass-sidebar p-6 flex flex-col sticky top-0 h-screen overflow-y-auto">
      {/* Brand */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center glow-red-sm">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-foreground">PPL Lead Mgmt</h1>
            <p className="text-[10px] uppercase tracking-[0.15em] text-red-700/40 dark:text-red-400/50 font-medium">Control Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/15 shadow-[0_0_12px_rgba(220,38,38,0.08)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.03] border border-transparent'
                  }
                `}
              >
                <item.icon className={`size-4 ${isActive ? 'text-red-700 dark:text-red-400' : ''}`} />
                {item.label}
                {isActive && (
                  <div className="ml-auto size-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(220,38,38,0.5)]" />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="my-6 h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent" />

      {/* Bottom */}
      <div className="mt-auto space-y-1">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <form action={logout}>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/5">
            <LogOut className="size-4" />
            Log out
          </Button>
        </form>
      </div>
    </aside>
  )
}
