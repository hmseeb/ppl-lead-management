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
import { format, addDays, startOfDay, endOfDay, isToday, isTomorrow } from 'date-fns'

type CallbackRow = {
  id: string
  scheduled_time: string
  status: string
  lead_name: string | null
  broker_name: string | null
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
  return format(new Date(), 'yyyy-MM-dd')
}

function getDefaultTo(): string {
  return format(addDays(new Date(), 7), 'yyyy-MM-dd')
}

export function UpcomingCallbacks() {
  const [dateFrom, setDateFrom] = useState(getDefaultFrom)
  const [dateTo, setDateTo] = useState(getDefaultTo)
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dateFrom || !dateTo) return

    let cancelled = false
    setLoading(true)

    const from = startOfDay(new Date(dateFrom + 'T00:00:00')).toISOString()
    const to = endOfDay(new Date(dateTo + 'T00:00:00')).toISOString()

    fetch(`/api/callbacks?status=pending&from=${from}&to=${to}&limit=100`)
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
  }, [dateFrom, dateTo])

  // Group callbacks by day
  const grouped: Record<string, CallbackRow[]> = {}
  for (const cb of callbacks) {
    const key = formatDateKey(cb.scheduled_time)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(cb)
  }

  const sortedDays = Object.keys(grouped).sort()

  function handleReset() {
    setDateFrom(getDefaultFrom())
    setDateTo(getDefaultTo())
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Upcoming Callbacks
          </CardTitle>
          <div className="flex items-center gap-2">
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
            No upcoming callbacks in this range
          </div>
        ) : (
          <div>
            {sortedDays.map((dateKey, idx) => (
              <div key={dateKey}>
                <div
                  className={`text-sm font-medium text-foreground border-b pb-1 mb-2 ${
                    idx === 0 ? '' : 'mt-4'
                  }`}
                >
                  {formatDayHeader(dateKey)}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Lead</TableHead>
                      <TableHead className="text-xs">Broker</TableHead>
                      <TableHead className="text-xs">Scheduled Time</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped[dateKey].map((cb) => (
                      <TableRow key={cb.id}>
                        <TableCell className="text-xs">{cb.lead_name || '-'}</TableCell>
                        <TableCell className="text-xs">{cb.broker_name || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(cb.scheduled_time), 'h:mm a')}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="capitalize text-amber-500 font-medium">
                            {cb.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
