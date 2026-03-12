import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { OrdersTable } from '@/components/orders/orders-table'
import { fetchOrdersWithBroker } from '@/lib/queries/orders'

export default async function OrdersPage() {
  const orders = await fetchOrdersWithBroker()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders <span className="text-muted-foreground text-base font-normal">({orders.length})</span></h1>
        <Link href="/orders/new">
          <Button>New Order</Button>
        </Link>
      </div>
      <OrdersTable orders={orders as any} />
    </div>
  )
}
