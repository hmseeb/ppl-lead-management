'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'

interface ChartData {
  date: string
  label: string
  count: number
}

export function LeadVolumeChart({ data }: { data: ChartData[] }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Lead Volume (7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="label"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: isDark ? 'rgba(220, 160, 160, 0.4)' : 'rgba(100, 80, 80, 0.5)' }}
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: isDark ? 'rgba(220, 160, 160, 0.4)' : 'rgba(100, 80, 80, 0.5)' }}
              />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(220, 38, 38, 0.06)' : 'rgba(220, 38, 38, 0.04)' }}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  background: isDark ? 'rgba(18, 8, 10, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  border: isDark ? '1px solid rgba(220, 38, 38, 0.15)' : '1px solid rgba(0, 0, 0, 0.08)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
                  color: isDark ? 'rgba(255, 220, 220, 0.8)' : 'rgba(40, 20, 20, 0.8)',
                }}
                labelFormatter={(label) => `${label}`}
              />
              <Bar
                dataKey="count"
                fill={isDark ? 'rgba(220, 38, 38, 0.7)' : 'rgba(220, 38, 38, 0.65)'}
                radius={[4, 4, 0, 0]}
                style={{ filter: isDark ? 'drop-shadow(0 0 6px rgba(220, 38, 38, 0.3))' : 'none' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
