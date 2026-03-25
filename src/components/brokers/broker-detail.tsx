import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BrokerStatusBadge } from './broker-status-badge'
import { format } from 'date-fns'
import Link from 'next/link'

export function BrokerDetail({ broker, orders, leads, queuedDeliveries }: {
  broker: any
  orders: any[]
  leads: any[]
  queuedDeliveries: any[]
}) {
  const scheduleLabel = broker.contact_hours === 'business_hours'
    ? 'Business Hours (9-5)'
    : broker.contact_hours === 'custom'
      ? 'Custom'
      : 'Anytime'

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Profile</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {broker.first_name} {broker.last_name}</div>
            <div><span className="text-muted-foreground">Company:</span> {broker.company || broker.company_name || '-'}</div>
            <div><span className="text-muted-foreground">Email:</span> {broker.email}</div>
            <div><span className="text-muted-foreground">Phone:</span> {broker.phone || '-'}</div>
            <div><span className="text-muted-foreground">GHL Webhook:</span> {broker.crm_webhook_url || 'Not set'}</div>
            <div><span className="text-muted-foreground">Status:</span> <BrokerStatusBadge status={broker.assignment_status} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Hours */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Contact Hours</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Schedule:</span> {scheduleLabel}</div>
            {broker.contact_hours === 'custom' && (
              <div><span className="text-muted-foreground">Window:</span> {broker.custom_hours_start} - {broker.custom_hours_end}</div>
            )}
            <div><span className="text-muted-foreground">Weekend Pause:</span> {broker.weekend_pause ? 'Yes' : 'No'}</div>
            <div><span className="text-muted-foreground">Timezone:</span> {broker.timezone || 'America/Los_Angeles (default)'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Queued Deliveries */}
      {queuedDeliveries.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Queued Deliveries ({queuedDeliveries.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Queued At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queuedDeliveries.map((d: any) => {
                  const lead = d.leads as { first_name: string | null; last_name: string | null } | null
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        {lead ? `${lead.first_name} ${lead.last_name}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs uppercase">{d.channel}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(d.created_at), 'MMM d, h:mm a')}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Orders */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Orders ({orders.length})</CardTitle></CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Verticals</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/orders/${order.id}`} className="font-mono text-xs hover:underline">
                        {order.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(order.verticals as string[]).map((v: string) => (
                          <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{order.total_leads}</TableCell>
                    <TableCell className="text-right">{order.leads_delivered}</TableCell>
                    <TableCell className="text-right">{order.leads_remaining}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{order.status}</Badge></TableCell>
                    <TableCell className="text-sm">{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No orders yet</p>
          )}
        </CardContent>
      </Card>

      {/* Leads History */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Lead History ({leads.length})</CardTitle></CardHeader>
        <CardContent>
          {leads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Vertical</TableHead>
                  <TableHead>Credit Score</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead: any) => {
                  const latestDelivery = lead.deliveries?.[0]
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
                        {lead.assigned_order_id && (
                          <Link href={`/orders/${lead.assigned_order_id}`} className="font-mono text-xs hover:underline">
                            {lead.assigned_order_id.slice(0, 8)}
                          </Link>
                        )}
                      </TableCell>
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
            <p className="text-sm text-muted-foreground">No leads received yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
