'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard, Users, ShoppingCart, FileText,
  AlertCircle, Activity, Phone, Settings, LogOut, UserCog,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import type { Role } from '@/lib/auth/role'

const allNavItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'marketer'] as Role[] },
  { href: '/leads', label: 'Leads', icon: FileText, roles: ['admin', 'marketer'] as Role[] },
  { href: '/brokers', label: 'Brokers', icon: Users, roles: ['admin', 'marketer'] as Role[] },
  { href: '/orders', label: 'Orders', icon: ShoppingCart, roles: ['admin', 'marketer'] as Role[] },
  { href: '/unassigned', label: 'Unassigned', icon: AlertCircle, roles: ['admin'] as Role[] },
  { href: '/activity', label: 'Activity', icon: Activity, roles: ['admin', 'marketer'] as Role[] },
  { href: '/calls', label: 'Calls', icon: Phone, roles: ['admin', 'marketer'] as Role[] },
  { href: '/marketers', label: 'Marketers', icon: UserCog, roles: ['admin'] as Role[] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'marketer'] as Role[] },
]

interface SidebarProps {
  role: Role
  logoutAction: () => Promise<void>
}

export function Sidebar({ role, logoutAction }: SidebarProps) {
  const pathname = usePathname()
  const navItems = allNavItems.filter(item => item.roles.includes(role))

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
            <p className="text-[10px] uppercase tracking-[0.15em] text-red-700/40 dark:text-red-400/50 font-medium">
              {role === 'marketer' ? 'Marketer View' : 'Control Panel'}
            </p>
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
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/5">
            <LogOut className="size-4" />
            Log out
          </Button>
        </form>
      </div>
    </aside>
  )
}
