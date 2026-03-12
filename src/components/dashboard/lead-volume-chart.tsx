'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartData {
  date: string
  label: string
  count: number
}

export function LeadVolumeChart({ data }: { data: ChartData[] }) {
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
                tick={{ fill: 'rgba(220, 160, 160, 0.4)' }}
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: 'rgba(220, 160, 160, 0.4)' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(220, 38, 38, 0.06)' }}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  background: 'rgba(18, 8, 10, 0.9)',
                  border: '1px solid rgba(220, 38, 38, 0.15)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  color: 'rgba(255, 220, 220, 0.8)',
                }}
                labelFormatter={(label) => `${label}`}
              />
              <Bar
                dataKey="count"
                fill="rgba(220, 38, 38, 0.7)"
                radius={[4, 4, 0, 0]}
                style={{ filter: 'drop-shadow(0 0 6px rgba(220, 38, 38, 0.3))' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
