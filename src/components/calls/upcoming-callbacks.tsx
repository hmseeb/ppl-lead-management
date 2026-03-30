'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { format, addDays, startOfDay, endOfDay, isToday, isTomorrow, isPast } from 'date-fns'

type CallbackRow = {
  id: string
  scheduled_time: string
  status: string
  notes: string | null
  lead_name: string | null
  lead_phone: string | null
  lead_vertical: string | null
  lead_credit_score: number | null
  broker_name: string | null
  broker_company: string | null
}

function formatDateKey(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy-MM-dd')
}

function formatDayHeader(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00')
  if (isToday(date)) return `Today, ${format(date, 'MMM d')}`
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'MMM d')}`
  return format(date, 'EEEE, MMM d')
}

function getDefaultFrom(): string {
  return format(addDays(new Date(), -3), 'yyyy-MM-dd')
}

function getDefaultTo(): string {
  return format(addDays(new Date(), 7), 'yyyy-MM-dd')
}

type StatusFilter = 'all' | 'pending' | 'completed' | 'cancelled'

function StatusBadge({ status, scheduledTime }: { status: string; scheduledTime: string }) {
  const isOverdue = status === 'pending' && isPast(new Date(scheduledTime))

  if (isOverdue) {
    return <span className="text-xs font-medium text-red-500">overdue</span>
  }

  const styles: Record<string, string> = {
    pending: 'text-amber-500',
    completed: 'text-emerald-500',
    cancelled: 'text-muted-foreground line-through',
  }

  return <span className={`text-xs font-medium capitalize ${styles[status] ?? 'text-muted-foreground'}`}>{status}</span>
}

export function UpcomingCallbacks() {
  const [dateFrom, setDateFrom] = useState(getDefaultFrom)
  const [dateTo, setDateTo] = useState(getDefaultTo)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dateFrom || !dateTo) return

    let cancelled = false
    setLoading(true)

    const from = startOfDay(new Date(dateFrom + 'T00:00:00')).toISOString()
    const to = endOfDay(new Date(dateTo + 'T00:00:00')).toISOString()
    const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''

    fetch(`/api/callbacks?from=${from}&to=${to}&limit=100${statusParam}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setCallbacks(json.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setCallbacks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dateFrom, dateTo, statusFilter])

  // Group callbacks by day
  const grouped: Record<string, CallbackRow[]> = {}
  for (const cb of callbacks) {
    const key = formatDateKey(cb.scheduled_time)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(cb)
  }

  const sortedDays = Object.keys(grouped).sort()

  // Count overdue
  const overdueCount = callbacks.filter(
    (cb) => cb.status === 'pending' && isPast(new Date(cb.scheduled_time))
  ).length

  function handleReset() {
    setDateFrom(getDefaultFrom())
    setDateTo(getDefaultTo())
    setStatusFilter('all')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Callback Tracker
            </CardTitle>
            {overdueCount > 0 && (
              <span className="text-[10px] font-medium bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">
                {overdueCount} overdue
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">From</span>
              <Input
                type="date"
                className="w-36 h-8 text-xs"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">To</span>
              <Input
                type="date"
                className="w-36 h-8 text-xs"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-8">
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : callbacks.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No callbacks in this range
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Lead</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Vertical</TableHead>
                <TableHead className="text-xs">Broker</TableHead>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
                <TableHead className="text-xs text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDays.map((dateKey) => (
                <>
                  <TableRow key={`day-${dateKey}`} className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={7} className="text-xs font-semibold py-2">
                      {formatDayHeader(dateKey)}
                      <span className="ml-2 text-muted-foreground font-normal">
                        ({grouped[dateKey].length})
                      </span>
                    </TableCell>
                  </TableRow>
                  {grouped[dateKey].map((cb) => (
                    <TableRow key={cb.id} className={cb.status === 'cancelled' ? 'opacity-50' : ''}>
                      <TableCell className="text-sm font-medium">
                        {cb.lead_name || '-'}
                        {cb.lead_credit_score && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground">{cb.lead_credit_score}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {cb.lead_phone || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {cb.lead_vertical || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{cb.broker_name || '-'}</div>
                        {cb.broker_company && (
                          <div className="text-[10px] text-muted-foreground">{cb.broker_company}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(cb.scheduled_time), 'h:mm a')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {cb.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge status={cb.status} scheduledTime={cb.scheduled_time} />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
