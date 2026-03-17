import { requireBrokerSession } from '@/lib/portal/guard'
import { getPortalOrders } from '@/lib/portal/queries'
import { OrdersList } from '@/components/portal/orders-list'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function BrokerOrdersPage() {
  const { brokerId } = await requireBrokerSession()
  const orders = await getPortalOrders(brokerId)

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-2">
        <Link
          href="/portal"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">My Orders</h1>
      </div>
      <OrdersList orders={orders} />
    </div>
  )
}
