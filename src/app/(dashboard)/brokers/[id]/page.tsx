export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { fetchBrokerDetail } from '@/lib/queries/brokers'
import { BrokerDetail } from '@/components/brokers/broker-detail'
import { BrokerQuickActions } from '@/components/brokers/broker-quick-actions'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default async function BrokerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await fetchBrokerDetail(id)

  if (!result) {
    return (
      <div className="space-y-4">
        <Link href="/brokers"><Button variant="ghost" size="sm"><ChevronLeft className="size-4 mr-1" /> Back to Brokers</Button></Link>
        <p className="text-muted-foreground">Broker not found.</p>
      </div>
    )
  }

  const activeCount = result.orders.filter((o: any) => o.status === 'active').length
  const pausedCount = result.orders.filter((o: any) => o.status === 'paused').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/brokers"><Button variant="ghost" size="sm"><ChevronLeft className="size-4 mr-1" /> Brokers</Button></Link>
          <h1 className="text-2xl font-semibold">{result.broker.first_name} {result.broker.last_name}</h1>
        </div>
        <BrokerQuickActions brokerId={id} activeOrdersCount={activeCount} pausedOrdersCount={pausedCount} hasWebhook={!!result.broker.crm_webhook_url} />
      </div>
      <BrokerDetail broker={result.broker} orders={result.orders} leads={result.leads} queuedDeliveries={result.queuedDeliveries} />
    </div>
  )
}
