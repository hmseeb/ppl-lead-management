import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  UserPlus, ShoppingCart, Sparkles,
  AlertTriangle, ArrowRightLeft, Zap, FileText,
} from 'lucide-react'

type ActivityRow = {
  id: string
  event_type: string
  details: unknown
  created_at: string
  broker_id: string | null
  lead_id: string | null
  order_id: string | null
  brokers: { first_name: string; last_name: string } | null
  leads: { first_name: string | null; last_name: string | null } | null
  orders: { id: string } | null
}

const eventColors: Record<string, string> = {
  lead_assigned: 'bg-green-100 text-green-800',
  manual_assignment: 'bg-green-100 text-green-800',
  lead_received: 'bg-blue-100 text-blue-800',
  order_created: 'bg-purple-100 text-purple-800',
  broker_created: 'bg-purple-100 text-purple-800',
  order_status_changed: 'bg-blue-100 text-blue-800',
  broker_status_changed: 'bg-blue-100 text-blue-800',
  bonus_mode_toggled: 'bg-indigo-100 text-indigo-800',
  webhook_failed_permanent: 'bg-red-100 text-red-800',
}

const eventIcons: Record<string, typeof FileText> = {
  lead_assigned: UserPlus,
  manual_assignment: Zap,
  order_created: ShoppingCart,
  order_status_changed: ArrowRightLeft,
  bonus_mode_toggled: Sparkles,
  webhook_failed_permanent: AlertTriangle,
}

export function ActivityLogTable({ data }: { data: ActivityRow[] }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">No activity log entries match your filters.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Broker</TableHead>
          <TableHead>Lead</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const Icon = eventIcons[row.event_type] ?? FileText
          const colorClass = eventColors[row.event_type] ?? 'bg-gray-100 text-gray-800'
          const details = row.details as Record<string, unknown> | null

          return (
            <TableRow key={row.id}>
              <TableCell className="text-sm whitespace-nowrap">
                {format(new Date(row.created_at), 'MMM d, yyyy h:mm a')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0" />
                  <Badge variant="outline" className={`text-xs border-0 capitalize ${colorClass}`}>
                    {row.event_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                {row.brokers ? (
                  <Link href={`/brokers/${row.broker_id}`} className="hover:underline text-sm">
                    {row.brokers.first_name} {row.brokers.last_name}
                  </Link>
                ) : '-'}
              </TableCell>
              <TableCell>
                {row.leads?.first_name ? (
                  <Link href={`/leads/${row.lead_id}`} className="hover:underline text-sm">
                    {row.leads.first_name} {row.leads.last_name}
                  </Link>
                ) : '-'}
              </TableCell>
              <TableCell>
                {row.orders ? (
                  <Link href={`/orders/${row.order_id}`} className="font-mono text-xs hover:underline">
                    {row.orders.id.slice(0, 8)}
                  </Link>
                ) : '-'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                {details ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ') : '-'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
