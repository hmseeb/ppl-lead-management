import { createAdminClient } from '@/lib/supabase/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { OrderStatusBadge, BonusBadge } from './order-status-badge'
import { OrderActions } from './order-actions'

export async function OrdersTable() {
  const supabase = createAdminClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      broker_id,
      total_leads,
      leads_delivered,
      leads_remaining,
      verticals,
      credit_score_min,
      status,
      bonus_mode,
      created_at,
      brokers!inner ( first_name, last_name )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="text-destructive">Failed to load orders: {error.message}</p>
  }

  if (!orders || orders.length === 0) {
    return <p className="text-muted-foreground">No orders yet. Create your first one.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Broker</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Delivered</TableHead>
          <TableHead className="text-right">Remaining</TableHead>
          <TableHead>Verticals</TableHead>
          <TableHead className="text-right">Credit Min</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          // Type the joined broker data
          const broker = order.brokers as unknown as {
            first_name: string
            last_name: string
          }

          return (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">
                {order.id.slice(0, 8)}
              </TableCell>
              <TableCell className="font-medium">
                {broker.first_name} {broker.last_name}
              </TableCell>
              <TableCell className="text-right">{order.total_leads}</TableCell>
              <TableCell className="text-right">{order.leads_delivered}</TableCell>
              <TableCell className="text-right">{order.leads_remaining}</TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {(order.verticals as string[]).map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {v}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {order.credit_score_min ?? '-'}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <OrderStatusBadge status={order.status} />
                  {order.bonus_mode && <BonusBadge />}
                </div>
              </TableCell>
              <TableCell>
                <OrderActions
                  orderId={order.id}
                  currentStatus={order.status}
                  bonusMode={order.bonus_mode}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
