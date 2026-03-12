import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { OrderStatusBadge, BonusBadge } from './order-status-badge'
import { format } from 'date-fns'
import Link from 'next/link'

export function OrderDetail({ order, leads }: { order: any; leads: any[] }) {
  const broker = order.brokers as { id: string; first_name: string; last_name: string; company: string | null }
  const progress = order.total_leads > 0 ? Math.round((order.leads_delivered / order.total_leads) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Order Info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Order Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Order ID:</span> <span className="font-mono">{order.id}</span></div>
            <div>
              <span className="text-muted-foreground">Broker:</span>{' '}
              <Link href={`/brokers/${broker.id}`} className="font-medium hover:underline">
                {broker.first_name} {broker.last_name}
              </Link>
              {broker.company && ` (${broker.company})`}
            </div>
            <div>
              <span className="text-muted-foreground">Verticals:</span>{' '}
              <span className="inline-flex gap-1">{(order.verticals as string[]).map((v: string) => (
                <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
              ))}</span>
            </div>
            <div><span className="text-muted-foreground">Credit Score Min:</span> {order.credit_score_min ?? 'None'}</div>
            <div><span className="text-muted-foreground">Status:</span> <OrderStatusBadge status={order.status} /> {order.bonus_mode && <BonusBadge />}</div>
            <div><span className="text-muted-foreground">Created:</span> {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{order.leads_delivered} / {order.total_leads} delivered</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{order.leads_remaining} remaining</p>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Leads */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Assigned Leads ({leads.length})</CardTitle></CardHeader>
        <CardContent>
          {leads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Assigned</TableHead>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Vertical</TableHead>
                  <TableHead>Credit Score</TableHead>
                  <TableHead>Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead: any) => {
                  const latestDelivery = lead.webhook_deliveries?.[0]
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="text-sm">
                        {lead.assigned_at ? format(new Date(lead.assigned_at), 'MMM d, h:mm a') : '-'}
                      </TableCell>
                      <TableCell>
                        <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                          {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'}
                        </Link>
                      </TableCell>
                      <TableCell>{lead.vertical || '-'}</TableCell>
                      <TableCell>{lead.credit_score ?? '-'}</TableCell>
                      <TableCell>
                        {latestDelivery ? (
                          <Badge variant="outline" className="text-xs capitalize">{latestDelivery.status}</Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No leads assigned to this order yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
