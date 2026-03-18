import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { OrderStatusBadge, BonusBadge } from './order-status-badge'
import { OrderActions } from './order-actions'

function OrderProgress({ delivered, total, status }: { delivered: number; total: number; status: string }) {
  const pct = total > 0 ? Math.round((delivered / total) * 100) : 0
  const barColor =
    status === 'completed' ? 'bg-muted-foreground/40'
    : status === 'paused' ? 'bg-amber-500'
    : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {delivered}/{total}
      </span>
    </div>
  )
}

type OrderWithBroker = {
  id: string
  broker_id: string
  total_leads: number
  leads_delivered: number
  leads_remaining: number
  verticals: string[]
  credit_score_min: number | null
  priority: string
  order_type: string
  loan_min: number | null
  loan_max: number | null
  status: string
  bonus_mode: boolean
  created_at: string
  brokers: { first_name: string; last_name: string }
  leads: [{ count: number }]
}

export function OrdersTable({ orders }: { orders: OrderWithBroker[] }) {
  if (orders.length === 0) {
    return <p className="text-muted-foreground">No orders yet. Create your first one.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Broker</TableHead>
          <TableHead className="text-right">Assigned</TableHead>
          <TableHead className="w-40">Progress</TableHead>
          <TableHead>Verticals</TableHead>
          <TableHead className="text-right">Credit Min</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const broker = order.brokers as { first_name: string; last_name: string }
          return (
            <TableRow key={order.id}>
              <TableCell>
                <Link href={`/orders/${order.id}`} className="font-mono text-xs hover:underline">
                  {order.id.slice(0, 8)}
                </Link>
              </TableCell>
              <TableCell className="font-medium">
                <Link href={`/brokers/${order.broker_id}`} className="hover:underline">
                  {broker.first_name} {broker.last_name}
                </Link>
              </TableCell>
              <TableCell className="text-right">{order.leads?.[0]?.count ?? 0}</TableCell>
              <TableCell>
                <OrderProgress
                  delivered={order.leads_delivered}
                  total={order.total_leads}
                  status={order.status}
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {(order.verticals as string[]).map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">{order.credit_score_min ?? '-'}</TableCell>
              <TableCell>
                {order.priority === 'high' ? (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">High</Badge>
                ) : '-'}
              </TableCell>
              <TableCell>
                {order.order_type === 'monthly' ? (
                  <Badge variant="outline">Monthly</Badge>
                ) : 'One-time'}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <OrderStatusBadge status={order.status} />
                  {order.bonus_mode && <BonusBadge />}
                </div>
              </TableCell>
              <TableCell>
                <OrderActions orderId={order.id} currentStatus={order.status} bonusMode={order.bonus_mode} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
