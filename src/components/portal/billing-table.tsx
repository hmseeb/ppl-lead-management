'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Receipt, ExternalLink, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { getReceiptUrl } from '@/lib/actions/billing'
import type { BillingOrder } from '@/lib/portal/queries'

function formatCents(cents: number | null): string {
  if (cents == null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</Badge>
    case 'completed':
      return <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">Completed</Badge>
    case 'paused':
      return <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400">Paused</Badge>
    case 'pending_payment':
      return <Badge variant="secondary" className="text-[10px] bg-gray-500/10 text-gray-500">Pending</Badge>
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>
  }
}

function ReceiptButton({ orderId, hasStripeSession }: { orderId: string; hasStripeSession: boolean }) {
  const [loading, setLoading] = useState(false)

  if (!hasStripeSession) return <span className="text-muted-foreground">-</span>

  async function handleClick() {
    setLoading(true)
    try {
      const result = await getReceiptUrl(orderId)
      if (result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <ExternalLink className="size-3" />
      )}
      Receipt
    </Button>
  )
}

export function BillingTable({ orders }: { orders: BillingOrder[] }) {
  const totalSpent = orders
    .filter((o) => o.status !== 'pending_payment')
    .reduce((sum, o) => sum + (o.total_price_cents ?? 0), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Receipt className="size-4 text-emerald-400" />
        <CardTitle className="text-sm font-medium">Order History</CardTitle>
        {totalSpent > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            Total: {formatCents(totalSpent)}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left pb-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Vertical</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Leads</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2.5 text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="py-2.5 capitalize">
                      {order.verticals.join(', ')}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {order.leads_delivered} / {order.total_leads}
                    </td>
                    <td className="py-2.5 tabular-nums font-medium">
                      {formatCents(order.total_price_cents)}
                    </td>
                    <td className="py-2.5">
                      {statusBadge(order.status)}
                    </td>
                    <td className="py-2.5">
                      <ReceiptButton
                        orderId={order.id}
                        hasStripeSession={!!order.stripe_checkout_session_id}
                      />
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
