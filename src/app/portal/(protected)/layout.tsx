import { redirect } from 'next/navigation'
import { getBrokerSession } from '@/lib/auth/broker-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { PortalHeader } from '@/components/portal/portal-header'

export default async function ProtectedPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getBrokerSession()

  if (!session.isBroker || !session.brokerId) {
    redirect('/portal/login')
  }

  const supabase = createAdminClient()
  const { data: broker } = await supabase
    .from('brokers')
    .select('first_name, last_name, email')
    .eq('id', session.brokerId)
    .single()

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
