import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

const deliveryStatusColors: Record<string, string> = {
  sent: 'bg-green-100 text-green-800',
  pending: 'bg-gray-100 text-gray-800',
  retrying: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
  failed_permanent: 'bg-red-100 text-red-800',
}

export function LeadDetail({ lead, deliveries, activityLog }: {
  lead: any
  deliveries: any[]
  activityLog: any[]
}) {
  const broker = lead.brokers
  const order = lead.orders

  return (
    <div className="space-y-6">
      {/* Lead Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {lead.first_name} {lead.last_name}</div>
            <div><span className="text-muted-foreground">Phone:</span> {lead.phone || '-'}</div>
            <div><span className="text-muted-foreground">Email:</span> {lead.email || '-'}</div>
            <div><span className="text-muted-foreground">Business:</span> {lead.business_name || '-'}</div>
            <div><span className="text-muted-foreground">Funding Amount:</span> {lead.funding_amount ? `$${lead.funding_amount.toLocaleString()}` : '-'}</div>
            <div><span className="text-muted-foreground">Funding Purpose:</span> {lead.funding_purpose || '-'}</div>
            <div><span className="text-muted-foreground">Vertical:</span> {lead.vertical || '-'}</div>
            <div><span className="text-muted-foreground">Credit Score:</span> {lead.credit_score ?? '-'}</div>
            <div><span className="text-muted-foreground">State:</span> {lead.state || '-'}</div>
            <div><span className="text-muted-foreground">Created:</span> {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}</div>
          </div>
        </CardContent>
      </Card>

      {/* AI Call */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Call</CardTitle>
        </CardHeader>
        <CardContent>
          {lead.ai_call_status ? (
            <div className="space-y-2">
              <Badge variant="secondary" className="capitalize">{lead.ai_call_status}</Badge>
              {lead.ai_call_notes && (
                <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{lead.ai_call_notes}</pre>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No AI call data</p>
          )}
        </CardContent>
      </Card>

      {/* Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {broker ? (
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Broker:</span>{' '}
                <Link href={`/brokers/${lead.assigned_broker_id}`} className="font-medium hover:underline">
                  {broker.first_name} {broker.last_name}
                </Link>
                {broker.company && ` (${broker.company})`}
              </div>
              {order && (
                <div>
                  <span className="text-muted-foreground">Order:</span>{' '}
                  <Link href={`/orders/${lead.assigned_order_id}`} className="font-mono text-xs hover:underline">
                    {order.id.slice(0, 8)}
                  </Link>
                </div>
              )}
              {lead.assigned_at && (
                <div><span className="text-muted-foreground">Assigned:</span> {format(new Date(lead.assigned_at), 'MMM d, yyyy h:mm a')}</div>
              )}
            </div>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-0">Unassigned</Badge>
          )}
        </CardContent>
      </Card>

      {/* Webhook Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Delivery Status</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs capitalize border-0 ${deliveryStatusColors[d.status] ?? ''}`}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.retry_count}</TableCell>
                    <TableCell>{d.sent_at ? format(new Date(d.sent_at), 'MMM d, h:mm a') : '-'}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate">{d.error_message || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No delivery records</p>
          )}
        </CardContent>
      </Card>

      {/* Activity History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLog.length > 0 ? (
            <div className="space-y-2">
              {activityLog.map((a: any) => (
                <div key={a.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                  <span className="capitalize">{a.event_type.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No activity for this lead</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
