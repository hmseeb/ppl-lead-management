import { PortalHeader } from '@/components/portal/portal-header'
import { requireBrokerSession } from '@/lib/portal/guard'
import { getPortalBroker } from '@/lib/portal/queries'

export default async function ProtectedPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { brokerId } = await requireBrokerSession()
  const broker = await getPortalBroker(brokerId)

  const brokerName = broker
    ? `${broker.first_name} ${broker.last_name}`
    : 'Broker'

  return (
    <div className="min-h-screen flex flex-col">
      <PortalHeader brokerName={brokerName} />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
