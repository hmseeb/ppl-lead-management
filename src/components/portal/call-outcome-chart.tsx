'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from 'next-themes'
import { BarChart3 } from 'lucide-react'
import type { PortalCallOutcomeVolume } from '@/lib/portal/call-queries'

function getChartTitle(totalDays: number, bucketType: 'daily' | 'weekly'): string {
  if (totalDays <= 1) return 'Call Outcomes (Today)'
  const suffix = bucketType === 'weekly' ? ', Weekly' : ''
  if (totalDays <= 7) return `Call Outcomes (${totalDays} Days${suffix})`
  if (totalDays <= 30) return `Call Outcomes (30 Days${suffix})`
  if (totalDays <= 90) return `Call Outcomes (90 Days${suffix})`
  return `Call Outcomes (${totalDays} Days${suffix})`
}

export function PortalCallOutcomeChart({
  data,
  bucketType = 'daily',
  totalDays = 7,
}: {
  data: PortalCallOutcomeVolume['data']
  bucketType?: 'daily' | 'weekly'
  totalDays?: number
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const hasData = data.length > 0 && data.some(
    (d) => d.transferred + d.callback_booked + d.no_answer + d.voicemail > 0
  )

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md hover:ring-foreground/15">
      <CardHeader className="flex flex-row items-center gap-2">
        <BarChart3 className="size-4 text-blue-400" />
        <CardTitle className="text-sm font-medium">
          {getChartTitle(totalDays, bucketType)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No call data in this period</p>
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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
                    fill: isDark
                      ? 'rgba(59, 130, 246, 0.06)'
                      : 'rgba(59, 130, 246, 0.04)',
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
                  labelFormatter={(label) => `${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Bar
                  dataKey="transferred"
                  name="Transferred"
                  stackId="outcome"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="callback_booked"
                  name="Callback Booked"
                  stackId="outcome"
                  fill="#8b5cf6"
                />
                <Bar
                  dataKey="no_answer"
                  name="No Answer"
                  stackId="outcome"
                  fill="#f59e0b"
                />
                <Bar
                  dataKey="voicemail"
                  name="Voicemail"
                  stackId="outcome"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
