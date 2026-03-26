import { Sidebar } from '@/components/layout/sidebar'
import { RealtimeListener } from '@/components/realtime-listener'
import { getRole } from '@/lib/auth/role'
import { logout, marketerLogout } from '@/lib/auth/actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getRole()

  return (
    <div className="min-h-screen flex">
      <Sidebar role={role} logoutAction={role === 'marketer' ? marketerLogout : logout} />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
      <RealtimeListener />
    </div>
  )
}
