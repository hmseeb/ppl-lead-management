'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'
import type { CallOutcomeVolume } from '@/lib/queries/call-reporting'

function getChartTitle(totalDays: number, bucketType: 'daily' | 'weekly'): string {
  if (totalDays <= 1) return 'Call Outcomes (Today)'
  const suffix = bucketType === 'weekly' ? ', Weekly' : ''
  if (totalDays <= 7) return `Call Outcomes (${totalDays} Days${suffix})`
  if (totalDays <= 30) return `Call Outcomes (30 Days${suffix})`
  if (totalDays <= 90) return `Call Outcomes (90 Days${suffix})`
  return `Call Outcomes (${totalDays} Days${suffix})`
}

export function CallOutcomeChart({
  data,
  bucketType = 'daily',
  totalDays = 7,
}: {
  data: CallOutcomeVolume['data']
  bucketType?: 'daily' | 'weekly'
  totalDays?: number
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {getChartTitle(totalDays, bucketType)}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                cursor={{ fill: isDark ? 'rgba(220, 38, 38, 0.06)' : 'rgba(220, 38, 38, 0.04)' }}
                contentStyle={{
                  fontSize: 11,
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  borderRadius: 8,
                  background: isDark ? '#0c0c12' : '#ffffff',
                  border: isDark ? '1px solid rgba(220, 38, 38, 0.15)' : '1px solid rgba(220, 38, 38, 0.10)',
                  boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.08)',
                  color: isDark ? '#e4e4ec' : '#0c0c12',
                }}
                labelFormatter={(label) => `${label}`}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
              />
              <Bar dataKey="transferred" name="Transferred" stackId="outcome" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="callback_booked" name="Callback Booked" stackId="outcome" fill="#8b5cf6" />
              <Bar dataKey="no_answer" name="No Answer" stackId="outcome" fill="#f59e0b" />
              <Bar dataKey="voicemail" name="Voicemail" stackId="outcome" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
