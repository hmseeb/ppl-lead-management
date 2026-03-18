'use client'

import { useState } from 'react'
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
import { ChevronDown, ChevronLeft, ChevronRight, Download, Users } from 'lucide-react'
import { format } from 'date-fns'
import type { LeadWithDelivery, DeliveryAttempt } from '@/lib/portal/queries'
import { getLeadDeliveries } from '@/lib/actions/portal-deliveries'
import { exportLeadsCsv } from '@/lib/actions/portal-export'

/* ------------------------------------------------------------------ */
/*  Delivery status badge (table-level, for the main row)              */
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

/* ------------------------------------------------------------------ */
/*  Attempt-level status badge (for delivery timeline)                 */
/* ------------------------------------------------------------------ */

function attemptStatusBadge(status: string) {
  switch (status) {
    case 'sent':
      return <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/20">Sent</Badge>
    case 'retrying':
      return <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/20">Retrying</Badge>
    case 'pending':
    case 'queued':
      return <Badge variant="secondary" className="text-[10px] bg-zinc-500/15 text-zinc-400 border-zinc-500/20">{status === 'pending' ? 'Pending' : 'Queued'}</Badge>
    case 'failed':
      return <Badge variant="destructive" className="text-[10px]">Failed</Badge>
    case 'failed_permanent':
      return <Badge variant="destructive" className="text-[10px]">Failed</Badge>
    default:
      return <Badge variant="secondary" className="text-[10px]">{status}</Badge>
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function channelLabel(channel: string): string {
  switch (channel) {
    case 'crm_webhook':
      return 'Webhook'
    case 'email':
      return 'Email'
    case 'sms':
      return 'SMS'
    default:
      return channel
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
/*  Delivery timeline (inline component)                               */
/* ------------------------------------------------------------------ */

function DeliveryTimeline({ attempts }: { attempts: DeliveryAttempt[] }) {
  if (attempts.length === 0) {
    return <p className="text-xs text-muted-foreground">No delivery attempts recorded.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Delivery History ({attempts.length} attempt{attempts.length !== 1 ? 's' : ''})
      </p>
      {attempts.map((attempt) => (
        <div key={attempt.id} className="flex items-start gap-3 text-xs">
          {/* Channel label */}
          <div className="w-20 shrink-0">
            <span className="font-medium">{channelLabel(attempt.channel)}</span>
          </div>
          {/* Status badge */}
          <div className="w-20 shrink-0">
            {attemptStatusBadge(attempt.status)}
          </div>
          {/* Timestamp */}
          <div className="w-32 shrink-0 text-muted-foreground tabular-nums">
            {attempt.sent_at
              ? format(new Date(attempt.sent_at), 'MMM d, h:mm:ss a')
              : format(new Date(attempt.created_at), 'MMM d, h:mm:ss a')}
          </div>
          {/* Error + retry info (failed statuses) */}
          {(attempt.status === 'failed' || attempt.status === 'failed_permanent') && (
            <div className="text-destructive/80 flex-1 min-w-0">
              {attempt.error_message && (
                <span className="break-words">{attempt.error_message}</span>
              )}
              {attempt.retry_count > 0 && (
                <span className="ml-2 text-muted-foreground">
                  ({attempt.retry_count} {attempt.retry_count === 1 ? 'retry' : 'retries'})
                </span>
              )}
            </div>
          )}
          {/* Retry info for retrying status */}
          {attempt.status === 'retrying' && attempt.retry_count > 0 && (
            <div className="text-amber-400/80 flex-1 min-w-0">
              Retry #{attempt.retry_count}
            </div>
          )}
        </div>
      ))}
    </div>
  )
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deliveryCache, setDeliveryCache] = useState<Record<string, DeliveryAttempt[]>>({})
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const hasActiveFilters = filterParams
    ? Object.entries(filterParams).some(([k, v]) => k !== 'page' && !!v)
    : false

  async function handleExport() {
    setExporting(true)
    try {
      const filters: { search?: string; vertical?: string; deliveryStatus?: string } = {}
      if (filterParams?.search) filters.search = filterParams.search
      if (filterParams?.vertical) filters.vertical = filterParams.vertical
      if (filterParams?.delivery_status) filters.deliveryStatus = filterParams.delivery_status

      const csv = await exportLeadsCsv(filters)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

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

  async function toggleRow(leadId: string) {
    if (expandedId === leadId) {
      setExpandedId(null)
      return
    }

    if (deliveryCache[leadId]) {
      setExpandedId(leadId)
      return
    }

    setLoading(true)
    setExpandedId(leadId)
    try {
      const attempts = await getLeadDeliveries(leadId)
      setDeliveryCache((prev) => ({ ...prev, [leadId]: attempts }))
    } catch {
      setDeliveryCache((prev) => ({ ...prev, [leadId]: [] }))
    } finally {
      setLoading(false)
    }
  }

  const COL_SPAN = 7 // extra column for chevron

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-emerald-400" />
          <h2 className="text-sm font-medium">All Leads</h2>
          <Badge variant="secondary" className="text-xs">
            {total}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={handleExport}
            disabled={exporting || leads.length === 0}
          >
            <Download className="size-3 mr-1" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
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
                <TableHead className="w-8" />
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Vertical</TableHead>
                <TableHead className="text-xs">Credit Score</TableHead>
                <TableHead className="text-xs">Funding Amount</TableHead>
                <TableHead className="text-xs">Delivery</TableHead>
                <TableHead className="text-xs">Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const isExpanded = expandedId === lead.id
                return (
                  <TableRow key={lead.id} className="group">
                    <TableCell
                      colSpan={COL_SPAN}
                      className="p-0"
                    >
                      {/* Main row content */}
                      <div
                        className="flex items-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleRow(lead.id)}
                      >
                        <div className="w-8 flex items-center justify-center shrink-0 px-2">
                          <ChevronDown
                            className={`size-3.5 text-muted-foreground transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                        <div className="flex-1 grid grid-cols-6 gap-0 py-2">
                          <div className="text-xs font-medium px-4 py-1">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-xs capitalize px-4 py-1">
                            {lead.vertical ?? '-'}
                          </div>
                          <div className="text-xs tabular-nums px-4 py-1">
                            {lead.credit_score ?? '-'}
                          </div>
                          <div className="text-xs tabular-nums px-4 py-1">
                            {formatAmount(lead.funding_amount)}
                          </div>
                          <div className="px-4 py-1">
                            {deliveryBadge(lead.delivery_status)}
                          </div>
                          <div className="text-xs text-muted-foreground px-4 py-1">
                            {lead.assigned_at
                              ? format(new Date(lead.assigned_at), 'MMM d, h:mm a')
                              : '-'}
                          </div>
                        </div>
                      </div>

                      {/* Expanded delivery timeline */}
                      {isExpanded && (
                        <div className="bg-muted/30 border-t border-border/50 px-6 py-4">
                          {loading && !deliveryCache[lead.id] ? (
                            <p className="text-xs text-muted-foreground">Loading delivery history...</p>
                          ) : (
                            <DeliveryTimeline attempts={deliveryCache[lead.id] ?? []} />
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
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
