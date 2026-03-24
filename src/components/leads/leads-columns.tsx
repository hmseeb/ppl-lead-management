'use client'

import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ManualAssignDialog } from '@/components/unassigned/manual-assign-dialog'

// Type the lead row from the query
export type LeadRow = {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  vertical: string | null
  credit_score: number | null
  funding_amount: number | null
  status: string
  rejection_reason: string | null
  ai_call_status: string | null
  created_at: string
  assigned_at: string | null
  assigned_broker_id: string | null
  assigned_order_id: string | null
  brokers: { first_name: string; last_name: string } | null
}

const statusColors: Record<string, string> = {
  assigned: 'bg-green-100 text-green-800',
  unassigned: 'bg-amber-100 text-amber-800',
  new: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
}

export const leadsColumns: ColumnDef<LeadRow>[] = [
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, h:mm a'),
  },
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const name = [row.original.first_name, row.original.last_name].filter(Boolean).join(' ') || 'Unknown'
      return (
        <Link href={`/leads/${row.original.id}`} className="font-medium hover:underline">
          {name}
        </Link>
      )
    },
  },
  { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone || '-' },
  { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email || '-' },
  {
    accessorKey: 'vertical',
    header: 'Vertical',
    cell: ({ row }) => row.original.vertical ? (
      <Badge variant="secondary" className="text-xs">{row.original.vertical}</Badge>
    ) : '-',
  },
  {
    accessorKey: 'credit_score',
    header: 'Credit',
    cell: ({ row }) => row.original.credit_score ?? '-',
  },
  {
    accessorKey: 'funding_amount',
    header: 'Amount',
    cell: ({ row }) => row.original.funding_amount
      ? `$${row.original.funding_amount.toLocaleString()}`
      : '-',
  },
  {
    id: 'broker',
    header: 'Broker',
    cell: ({ row, table }) => {
      const broker = row.original.brokers
      if (broker) return `${broker.first_name} ${broker.last_name}`

      const brokersWithOrders = (table.options.meta as any)?.brokersWithOrders ?? []
      const lead = row.original
      const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'

      return (
        <div className="flex items-center gap-2">
          <ManualAssignDialog
            leadId={lead.id}
            leadName={leadName}
            leadVertical={lead.vertical}
            leadCreditScore={lead.credit_score}
            brokers={brokersWithOrders}
          />
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      const reason = row.original.rejection_reason
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className={`text-xs capitalize border-0 ${statusColors[status] ?? ''}`}>
            {status}
          </Badge>
          {reason && (
            <span className="text-[10px] text-muted-foreground">
              {reason.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'ai_call_status',
    header: 'AI Call',
    cell: ({ row }) => row.original.ai_call_status ? (
      <Badge variant="secondary" className="text-xs capitalize">{row.original.ai_call_status}</Badge>
    ) : '-',
  },
]
