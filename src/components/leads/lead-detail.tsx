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

export function LeadDetail({ lead, deliveries, activityLog, routingLogs = [] }: {
  lead: any
  deliveries: any[]
  activityLog: any[]
  routingLogs?: any[]
}) {
  const broker = lead.brokers
  const order = lead.orders

  return (
    <div className="space-y-6">
      {/* Rejection Reason */}
      {lead.rejection_reason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">Rejected</h3>
          <p className="mt-1 text-sm text-red-700">
            Reason: {lead.rejection_reason.replace(/_/g, ' ')}
          </p>
        </div>
      )}

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

      {/* Routing Audit */}
      {routingLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Routing Audit</CardTitle>
            <p className="text-sm text-muted-foreground">{routingLogs.length} orders evaluated</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Credit Fit</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead className="text-right">Tier Match</TableHead>
                  <TableHead className="text-right">Loan Fit</TableHead>
                  <TableHead className="text-right">Bonuses</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routingLogs.map((log: any) => {
                  const sb = log.score_breakdown ?? {}
                  const isDisqualified = !log.eligible
                  const bonuses = (sb.priority_bonus ?? 0) + (sb.urgency_bonus ?? 0)
                  const brokerName = log.brokers
                    ? `${log.brokers.first_name} ${log.brokers.last_name}`
                    : '-'
                  const fillPct = Math.round(log.fill_rate * 100)

                  return (
                    <TableRow
                      key={log.id}
                      className={
                        log.selected
                          ? 'bg-green-50'
                          : isDisqualified
                            ? 'bg-red-50/50'
                            : ''
                      }
                    >
                      <TableCell>
                        <Link href={`/orders/${log.order_id}`} className="font-mono text-xs hover:underline">
                          {log.order_id.slice(0, 8)}
                        </Link>
                        <div className="text-xs text-muted-foreground">{brokerName}</div>
                      </TableCell>
                      <TableCell>
                        {log.selected ? (
                          <Badge variant="outline" className="text-xs border-0 bg-green-100 text-green-800">Selected</Badge>
                        ) : log.eligible ? (
                          <Badge variant="outline" className="text-xs border-0 bg-blue-100 text-blue-800">Eligible</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-0 bg-red-100 text-red-800">Disqualified</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {isDisqualified
                          ? (log.disqualify_reason ?? '').replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())
                          : ''}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs">
                        {isDisqualified ? '-' : (sb.credit_fit ?? 0).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs">
                        {isDisqualified ? '-' : (
                          <div>
                            {(sb.capacity ?? 0).toFixed(1)}
                            <div className="text-muted-foreground">{fillPct}% full</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs">
                        {isDisqualified ? '-' : (sb.tier_match ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs">
                        {isDisqualified ? '-' : (sb.loan_fit ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs">
                        {isDisqualified ? '-' : (bonuses >= 0 ? `+${bonuses}` : bonuses)}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-mono text-xs ${log.selected ? 'font-bold' : ''}`}>
                        {isDisqualified ? '-' : (sb.total ?? 0).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
