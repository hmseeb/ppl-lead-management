import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { ManualAssignDialog } from './manual-assign-dialog'
import { CheckCircle } from 'lucide-react'

type QueueItem = {
  id: string
  reason: string
  details: string | null
  created_at: string
  leads: {
    id: string
    first_name: string | null
    last_name: string | null
    vertical: string | null
    credit_score: number | null
    funding_amount: number | null
    phone: string | null
    email: string | null
  } | null
}

type BrokerWithOrders = {
  id: string
  first_name: string
  last_name: string
  company: string | null
  orders: {
    id: string
    verticals: string[]
    leads_remaining: number
    status: string
    bonus_mode: boolean
  }[]
}

export function UnassignedTable({ queue, brokers }: { queue: QueueItem[]; brokers: BrokerWithOrders[] }) {
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle className="size-12 text-green-500 mb-3" />
        <p className="text-lg font-medium">No unassigned leads</p>
        <p className="text-sm text-muted-foreground">All leads have been matched.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Lead Name</TableHead>
          <TableHead>Vertical</TableHead>
          <TableHead>Credit Score</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="w-24">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queue.map((item) => {
          const lead = item.leads
          if (!lead) return null
          const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
          return (
            <TableRow key={item.id}>
              <TableCell className="text-sm">{format(new Date(item.created_at), 'MMM d, h:mm a')}</TableCell>
              <TableCell>
                <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">{name}</Link>
              </TableCell>
              <TableCell>
                {lead.vertical ? <Badge variant="secondary" className="text-xs">{lead.vertical}</Badge> : '-'}
              </TableCell>
              <TableCell>{lead.credit_score ?? '-'}</TableCell>
              <TableCell>{lead.funding_amount ? `$${lead.funding_amount.toLocaleString()}` : '-'}</TableCell>
              <TableCell className="text-sm">{item.reason}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{item.details || '-'}</TableCell>
              <TableCell>
                <ManualAssignDialog
                  leadId={lead.id}
                  leadName={name}
                  leadVertical={lead.vertical}
                  leadCreditScore={lead.credit_score}
                  brokers={brokers}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
