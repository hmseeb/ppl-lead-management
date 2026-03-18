import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { format } from 'date-fns'
import type { LeadWithDelivery } from '@/lib/portal/queries'

/* ------------------------------------------------------------------ */
/*  Delivery status badge                                              */
/* ------------------------------------------------------------------ */

function deliveryBadge(status: string | null) {
  switch (status) {
    case 'sent':
      return <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/20">Sent</Badge>
    case 'retrying':
      return <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/20">Retrying</Badge>
    case 'queued':
      return <Badge variant="secondary" className="text-[10px] bg-zinc-500/15 text-zinc-400 border-zinc-500/20">Queued</Badge>
    case 'failed':
      return <Badge variant="destructive" className="text-[10px]">Failed</Badge>
    case 'failed_permanent':
      return <Badge variant="destructive" className="text-[10px]">Failed</Badge>
    default:
      return <span className="text-xs text-muted-foreground">-</span>
  }
}

function formatAmount(amount: number | null): string {
  if (!amount) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/* ------------------------------------------------------------------ */
/*  Leads table                                                        */
/* ------------------------------------------------------------------ */

export function LeadsTable({
  leads,
  total,
  page,
  perPage,
  filterParams,
}: {
  leads: LeadWithDelivery[]
  total: number
  page: number
  perPage: number
  filterParams?: Record<string, string | undefined>
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const hasActiveFilters = filterParams
    ? Object.entries(filterParams).some(([k, v]) => k !== 'page' && !!v)
    : false

  function paginationUrl(p: number) {
    const url = new URLSearchParams()
    if (filterParams) {
      Object.entries(filterParams).forEach(([k, v]) => {
        if (v && k !== 'page') url.set(k, v)
      })
    }
    url.set('page', String(p))
    return `/portal/leads?${url.toString()}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-emerald-400" />
          <h2 className="text-sm font-medium">All Leads</h2>
          <Badge variant="secondary" className="text-xs">
            {total}
          </Badge>
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {hasActiveFilters ? 'No leads found.' : 'No leads assigned yet.'}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Vertical</TableHead>
                <TableHead className="text-xs">Credit Score</TableHead>
                <TableHead className="text-xs">Funding Amount</TableHead>
                <TableHead className="text-xs">Delivery</TableHead>
                <TableHead className="text-xs">Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="text-xs font-medium">
                    {lead.first_name} {lead.last_name}
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {lead.vertical ?? '-'}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {lead.credit_score ?? '-'}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {formatAmount(lead.funding_amount)}
                  </TableCell>
                  <TableCell>
                    {deliveryBadge(lead.delivery_status)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lead.assigned_at
                      ? format(new Date(lead.assigned_at), 'MMM d, h:mm a')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {hasPrev ? (
                <Link href={paginationUrl(page - 1)}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <ChevronLeft className="size-3 mr-1" /> Prev
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                  <ChevronLeft className="size-3 mr-1" /> Prev
                </Button>
              )}
              {hasNext ? (
                <Link href={paginationUrl(page + 1)}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Next <ChevronRight className="size-3 ml-1" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                  Next <ChevronRight className="size-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
