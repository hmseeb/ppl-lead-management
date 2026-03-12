import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { OrdersTable } from '@/components/orders/orders-table'

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Link href="/orders/new">
          <Button>New Order</Button>
        </Link>
      </div>
      <OrdersTable />
    </div>
  )
}
