import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BrokerStatusBadge } from './broker-status-badge'
import { BrokerActions } from './broker-actions'

type BrokerWithStats = {
  id: string
  first_name: string
  last_name: string
  company: string | null
  email: string
  phone: string | null
  assignment_status: string
  active_orders_count: number
  total_leads_delivered: number
  last_delivery_date: string | null
}

export function BrokersTable({ brokers }: { brokers: BrokerWithStats[] }) {
  if (brokers.length === 0) {
    return <p className="text-muted-foreground">No brokers yet. Create your first one.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-right">Active Orders</TableHead>
          <TableHead className="text-right">Leads Delivered</TableHead>
          <TableHead>Last Delivery</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {brokers.map((broker) => (
          <TableRow key={broker.id}>
            <TableCell className="font-medium">
              <Link href={`/brokers/${broker.id}`} className="hover:underline">
                {broker.first_name} {broker.last_name}
              </Link>
            </TableCell>
            <TableCell>{broker.company || '-'}</TableCell>
            <TableCell>{broker.email}</TableCell>
            <TableCell className="text-right">{broker.active_orders_count}</TableCell>
            <TableCell className="text-right">{broker.total_leads_delivered}</TableCell>
            <TableCell>
              {broker.last_delivery_date
                ? formatDistanceToNow(new Date(broker.last_delivery_date), { addSuffix: true })
                : 'Never'}
            </TableCell>
            <TableCell>
              <BrokerStatusBadge status={broker.assignment_status} />
            </TableCell>
            <TableCell>
              <BrokerActions brokerId={broker.id} currentStatus={broker.assignment_status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
