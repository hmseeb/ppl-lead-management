'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from 'next-themes'
import {
  TrendingUp,
  Phone,
  BarChart3,
  CalendarClock,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import type { LeadVolumeTrendData, AvgCreditScoreData } from '@/lib/portal/queries'
import type { PortalCallKpis, PortalUpcomingCallback } from '@/lib/portal/call-queries'

/* ------------------------------------------------------------------ */
/*  Lead Volume Trend Chart                                            */
/* ------------------------------------------------------------------ */

export function LeadVolumeTrendChart({
  data,
  bucketType = 'daily',
  totalDays = 7,
}: {
  data: LeadVolumeTrendData['data']
  bucketType?: 'daily' | 'weekly'
  totalDays?: number
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const hasData = data.length > 0 && data.some((d) => d.count > 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <TrendingUp className="size-4 text-blue-400" />
        <CardTitle className="text-sm font-medium">Lead Volume</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">No lead data yet.</p>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <XAxis
                  dataKey="label"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: isDark ? '#8b8b9e' : '#64648c' }}
                />
                <YAxis
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: isDark ? '#8b8b9e' : '#64648c' }}
                />
                <Tooltip
                  cursor={{
                    stroke: isDark
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(59, 130, 246, 0.15)',
                  }}
                  contentStyle={{
                    fontSize: 11,
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    borderRadius: 8,
                    background: isDark ? '#0c0c12' : '#ffffff',
                    border: isDark
                      ? '1px solid rgba(59, 130, 246, 0.15)'
                      : '1px solid rgba(59, 130, 246, 0.10)',
                    boxShadow: isDark
                      ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                      : '0 8px 32px rgba(0, 0, 0, 0.08)',
                    color: isDark ? '#e4e4ec' : '#0c0c12',
                  }}
                  formatter={(value) => [value, 'Leads']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  style={{
                    filter: isDark
                      ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))'
                      : 'none',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Call Summary Card (compact for dashboard)                           */
/* ------------------------------------------------------------------ */

export function CallSummaryCard({
  kpis,
  nextCallback,
}: {
  kpis: PortalCallKpis
  nextCallback: PortalUpcomingCallback | null
}) {
  const transferRate =
    kpis.totalCalls > 0
      ? Math.round((kpis.transferred / kpis.totalCalls) * 100)
      : 0

  const callbackLabel = nextCallback
    ? `${nextCallback.lead?.first_name ?? ''} ${nextCallback.lead?.last_name ?? ''}`.trim() || 'Unknown Lead'
    : null
  const callbackTime = nextCallback
    ? format(new Date(nextCallback.scheduled_time), 'MMM d, h:mm a')
    : null

  const rows = [
    { label: 'Total Calls', value: String(kpis.totalCalls) },
    { label: 'Transfer Rate', value: `${transferRate}%` },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Phone className="size-4 text-blue-400" />
        <CardTitle className="text-sm font-medium">Call Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-sm font-semibold tabular-nums">
                {row.value}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Next Callback</span>
            {callbackLabel ? (
              <div className="text-right">
                <span className="text-sm font-semibold block">{callbackLabel}</span>
                <span className="text-[10px] text-muted-foreground">{callbackTime}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">None scheduled</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Avg Credit Score Card                                              */
/* ------------------------------------------------------------------ */

function scoreColor(avg: number): string {
  if (avg >= 680) return 'text-emerald-500'
  if (avg >= 600) return 'text-amber-500'
  return 'text-red-500'
}

export function AvgCreditScoreCard({ data }: { data: AvgCreditScoreData }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <BarChart3 className="size-4 text-amber-400" />
        <CardTitle className="text-sm font-medium">Avg. Credit Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-2">
        <span
          className={`text-3xl font-semibold tabular-nums ${
            data.average !== null ? scoreColor(data.average) : 'text-muted-foreground'
          }`}
        >
          {data.average !== null ? data.average : '--'}
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          {data.count > 0 ? `${data.count} leads scored` : 'No scored leads'}
        </span>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Next Callback Card (prominent)                                     */
/* ------------------------------------------------------------------ */

export function NextCallbackCard({
  callback,
}: {
  callback: PortalUpcomingCallback | null
}) {
  const leadName = callback
    ? `${callback.lead?.first_name ?? ''} ${callback.lead?.last_name ?? ''}`.trim() || 'Unknown Lead'
    : null

  return (
    <Card className={callback ? 'bg-violet-500/5' : ''}>
      <CardHeader className="flex flex-row items-center gap-2">
        <CalendarClock className="size-4 text-violet-500" />
        <CardTitle className="text-sm font-medium">Next Callback</CardTitle>
      </CardHeader>
      <CardContent>
        {!callback ? (
          <p className="text-sm text-muted-foreground">No upcoming callbacks</p>
        ) : (
          <div>
            <p className="text-base font-semibold">{leadName}</p>
            <div className="flex items-center gap-1 mt-1">
              <Clock className="size-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {format(new Date(callback.scheduled_time), 'MMM d, h:mm a')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
