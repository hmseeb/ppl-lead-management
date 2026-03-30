'use client'

import { useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Pause, Play, Loader2, Plus, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { brokerPauseOrder, brokerResumeOrder } from '@/lib/actions/portal-self-service'

type Order = {
  id: string
  total_leads: number
  leads_delivered: number
  leads_remaining: number
  verticals: string[]
  credit_score_min: number | null
  status: string
  bonus_mode: boolean
  order_type: string
  priority: string
  created_at: string
  updated_at: string
}

function statusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'paused':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'completed':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    default:
      return ''
  }
}

function OrderRow({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition()

  const pct =
    order.total_leads > 0
      ? Math.round((order.leads_delivered / order.total_leads) * 100)
      : 0

  function handlePause() {
    startTransition(async () => {
      await brokerPauseOrder(order.id)
    })
  }

  function handleResume() {
    startTransition(async () => {
      await brokerResumeOrder(order.id)
    })
  }

  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-3">
      {/* Top row: vertical + status + action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {order.verticals.join(', ')}
          </span>
          {order.credit_score_min && (
            <span className="text-xs text-muted-foreground">
              {order.credit_score_min}+ credit
            </span>
          )}
          <Badge variant="outline" className="text-[10px] capitalize">
            {order.priority}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] capitalize ${statusColor(order.status)}`}
          >
            {order.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {order.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={handlePause}
            >
              {isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <>
                  <Pause className="size-3 mr-1" /> Pause
                </>
              )}
            </Button>
          )}
          {order.status === 'paused' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={handleResume}
            >
              {isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <>
                  <Play className="size-3 mr-1" /> Resume
                </>
              )}
            </Button>
          )}
          {order.status === 'completed' && (
            <Button variant="outline" size="sm" className="h-7 text-xs opacity-50 cursor-not-allowed" disabled>
              <RefreshCw className="size-3 mr-1" /> Reorder
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>
            {order.leads_delivered} / {order.total_leads} leads ({pct}%)
          </span>
          <span>{order.leads_remaining} remaining</span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>Created {format(new Date(order.created_at), 'MMM d, yyyy')}</span>
        <span className="capitalize">{order.order_type}</span>
        {order.bonus_mode && (
          <Badge variant="secondary" className="text-[10px]">Bonus</Badge>
        )}
      </div>
    </div>
  )
}

export function OrdersList({ orders }: { orders: Order[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Package className="size-4 text-blue-400" />
        <CardTitle className="text-sm font-medium">All Orders</CardTitle>
        <Badge variant="secondary" className="ml-auto text-xs">
          {orders.length}
        </Badge>
        <Button size="sm" variant="outline" className="text-xs h-7 opacity-50 cursor-not-allowed" disabled>
          <Plus className="size-3 mr-1" /> New Order
        </Button>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
