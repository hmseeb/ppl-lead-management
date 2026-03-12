import Link from 'next/link'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-muted/40 p-6 flex flex-col">
        <h1 className="text-lg font-semibold mb-6">PPL Lead Mgmt</h1>
        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm font-medium hover:underline"
          >
            Dashboard
          </Link>
          <Link
            href="/brokers"
            className="text-sm font-medium hover:underline"
          >
            Brokers
          </Link>
          <Link
            href="/orders"
            className="text-sm font-medium hover:underline"
          >
            Orders
          </Link>
        </nav>
        <Separator className="my-4" />
        <div className="mt-auto">
          <form action={logout}>
            <Button variant="outline" size="sm" className="w-full">
              Log out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
