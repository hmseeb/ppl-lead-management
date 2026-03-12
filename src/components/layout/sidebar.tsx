'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LayoutDashboard, Users, ShoppingCart, LogOut } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/brokers', label: 'Brokers', icon: Users },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-muted/40 p-6 flex flex-col">
      <h1 className="text-lg font-semibold mb-6">PPL Lead Mgmt</h1>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
              >
                <item.icon className="size-4" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>
      <Separator className="my-4" />
      <div className="mt-auto">
        <form action={logout}>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <LogOut className="size-4" />
            Log out
          </Button>
        </form>
      </div>
    </aside>
  )
}
