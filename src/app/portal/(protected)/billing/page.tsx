import { requireBrokerSession } from '@/lib/portal/guard'
import { fetchBrokerBillingOrders } from '@/lib/portal/queries'
import { BillingTable } from '@/components/portal/billing-table'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function BillingPage() {
  const { brokerId } = await requireBrokerSession()
  const orders = await fetchBrokerBillingOrders(brokerId)

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-2">
        <Link
          href="/portal"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Billing</h1>
      </div>
      <BillingTable orders={orders} />
    </div>
  )
}
