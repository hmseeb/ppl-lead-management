import { requireBrokerSession } from '@/lib/portal/guard'
import { getPortalBroker } from '@/lib/portal/queries'

export default async function PortalHomePage() {
  const { brokerId } = await requireBrokerSession()
  const broker = await getPortalBroker(brokerId)

  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome, {broker?.first_name ?? 'Broker'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Your broker dashboard is coming soon.
        </p>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-2">
        <p className="text-sm text-muted-foreground">Account Info</p>
        <div className="grid gap-2">
          <div className="flex gap-2 text-sm">
            <span className="font-medium w-16">Name</span>
            <span>{broker?.first_name} {broker?.last_name}</span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="font-medium w-16">Email</span>
            <span>{broker?.email}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
