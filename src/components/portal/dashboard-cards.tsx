import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Package,
  Users,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
} from 'lucide-react'
import { format } from 'date-fns'
import type {
  ActiveOrder,
  RecentLead,
  SpendSummary,
  DeliveryHealth,
} from '@/lib/portal/queries'

/* ------------------------------------------------------------------ */
/*  Active Orders Card                                                 */
/* ------------------------------------------------------------------ */

export function ActiveOrdersCard({ orders }: { orders: ActiveOrder[] }) {
  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center gap-2">
        <Package className="size-4 text-blue-400" />
        <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
        <Badge variant="secondary" className="ml-auto text-xs">
          {orders.length}
        </Badge>
        <CardAction>
          <Link href="/portal/orders/new">
            <Button size="sm" variant="outline" className="text-xs h-7">
              <Plus className="size-3 mr-1" /> New Order
            </Button>
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active orders.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const pct =
                order.total_leads > 0
                  ? Math.round(
                      (order.leads_delivered / order.total_leads) * 100
                    )
                  : 0
              return (
                <div key={order.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {order.verticals.join(', ')}
                      </span>
                      {order.credit_score_min && (
                        <span className="text-xs text-muted-foreground">
                          {order.credit_score_min}+ credit
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {order.priority}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {order.leads_delivered} / {order.total_leads} leads
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{pct}% complete</span>
                    <span>{order.leads_remaining} remaining</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Recent Leads Card                                                  */
/* ------------------------------------------------------------------ */

export function RecentLeadsCard({ leads }: { leads: RecentLead[] }) {
  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center gap-2">
        <Users className="size-4 text-emerald-400" />
        <CardTitle className="text-sm font-medium">Recent Leads</CardTitle>
        <Badge variant="secondary" className="ml-auto text-xs">
          Last {leads.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No leads delivered yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left pb-2 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">
                    Vertical
                  </th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">
                    Credit Score
                  </th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">
                    Delivered
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border/30 last:border-0"
                  >
                    <td className="py-2">
                      {lead.first_name} {lead.last_name}
                    </td>
                    <td className="py-2 capitalize">
                      {lead.vertical ?? '-'}
                    </td>
                    <td className="py-2 tabular-nums">
                      {lead.credit_score ?? '-'}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {lead.assigned_at
                        ? format(new Date(lead.assigned_at), 'MMM d, h:mm a')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Spend Summary Card                                                 */
/* ------------------------------------------------------------------ */

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function SpendSummaryCard({ spend }: { spend: SpendSummary }) {
  const items = [
    {
      label: 'All-Time Spent',
      value: formatCents(spend.totalAllTimeCents),
      icon: DollarSign,
      color: 'text-emerald-400',
    },
    {
      label: 'This Month',
      value: formatCents(spend.totalThisMonthCents),
      icon: Clock,
      color: 'text-blue-400',
    },
    {
      label: 'Active Order Value',
      value: formatCents(spend.activeOrderValueCents),
      icon: Package,
      color: 'text-amber-400',
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <DollarSign className="size-4 text-emerald-400" />
        <CardTitle className="text-sm font-medium">Spend Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <item.icon className={`size-3.5 ${item.color}`} />
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Delivery Health Card                                               */
/* ------------------------------------------------------------------ */

function channelLabel(channel: string): string {
  switch (channel) {
    case 'crm_webhook':
      return 'Webhook'
    case 'email':
      return 'Email'
    case 'sms':
      return 'SMS'
    default:
      return channel
  }
}

export function DeliveryHealthCard({ health }: { health: DeliveryHealth[] }) {
  const totalDeliveries = health.reduce((sum, h) => sum + h.total, 0)
  const totalSent = health.reduce((sum, h) => sum + h.sent, 0)
  const overallRate =
    totalDeliveries > 0 ? Math.round((totalSent / totalDeliveries) * 100) : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Activity className="size-4 text-violet-400" />
        <CardTitle className="text-sm font-medium">Delivery Health</CardTitle>
        {totalDeliveries > 0 && (
          <Badge
            variant={overallRate >= 90 ? 'secondary' : 'destructive'}
            className="ml-auto text-xs"
          >
            {overallRate}% overall
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {health.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deliveries yet.</p>
        ) : (
          <div className="grid gap-4">
            {health.map((h) => (
              <div key={h.channel} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {channelLabel(h.channel)}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {h.successRate}% success
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      h.successRate >= 90
                        ? 'bg-emerald-500'
                        : h.successRate >= 70
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${h.successRate}%` }}
                  />
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <CheckCircle className="size-2.5 text-emerald-500" />
                    {h.sent} sent
                  </span>
                  <span className="flex items-center gap-0.5">
                    <XCircle className="size-2.5 text-red-500" />
                    {h.failed} failed
                  </span>
                  {h.pending > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="size-2.5 text-amber-500" />
                      {h.pending} pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
