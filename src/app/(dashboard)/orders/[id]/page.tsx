import Link from 'next/link'
import { fetchOrderDetail } from '@/lib/queries/orders'
import { OrderDetail } from '@/components/orders/order-detail'
import { OrderActions } from '@/components/orders/order-actions'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await fetchOrderDetail(id)

  if (!result) {
    return (
      <div className="space-y-4">
        <Link href="/orders"><Button variant="ghost" size="sm"><ChevronLeft className="size-4 mr-1" /> Back to Orders</Button></Link>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    )
  }

  const broker = result.order.brokers as { first_name: string; last_name: string }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/orders"><Button variant="ghost" size="sm"><ChevronLeft className="size-4 mr-1" /> Orders</Button></Link>
          <h1 className="text-2xl font-semibold">
            Order {result.order.id.slice(0, 8)} <span className="text-muted-foreground text-base font-normal">({broker.first_name} {broker.last_name})</span>
          </h1>
        </div>
        <OrderActions orderId={id} currentStatus={result.order.status} bonusMode={result.order.bonus_mode} />
      </div>
      <OrderDetail order={result.order} leads={result.leads} />
    </div>
  )
}
