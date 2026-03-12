import { createAdminClient } from '@/lib/supabase/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BrokerStatusBadge } from './broker-status-badge'
import { BrokerActions } from './broker-actions'

export async function BrokersTable() {
  const supabase = createAdminClient()
  const { data: brokers, error } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, company, email, phone, assignment_status')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="text-destructive">Failed to load brokers: {error.message}</p>
  }

  if (!brokers || brokers.length === 0) {
    return <p className="text-muted-foreground">No brokers yet. Create your first one.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {brokers.map((broker) => (
          <TableRow key={broker.id}>
            <TableCell className="font-medium">
              {broker.first_name} {broker.last_name}
            </TableCell>
            <TableCell>{broker.company || '-'}</TableCell>
            <TableCell>{broker.email}</TableCell>
            <TableCell>{broker.phone || '-'}</TableCell>
            <TableCell>
              <BrokerStatusBadge status={broker.assignment_status} />
            </TableCell>
            <TableCell>
              <BrokerActions
                brokerId={broker.id}
                currentStatus={broker.assignment_status}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
