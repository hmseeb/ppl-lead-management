'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'
import { TrendingUp } from 'lucide-react'
import type { MonthlySpend } from '@/lib/portal/queries'

export function SpendTrendChart({ data }: { data: MonthlySpend[] }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const hasData = data.length > 0 && data.some((d) => d.totalCents > 0)

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md hover:ring-foreground/15">
      <CardHeader className="flex flex-row items-center gap-2">
        <TrendingUp className="size-4 text-emerald-400" />
        <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No spend data in this period</p>
          </div>
        ) : (
          <div className="h-[200px]">
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
                  tick={{ fill: isDark ? '#8b8b9e' : '#64648c' }}
                  tickFormatter={(v) => '$' + (v / 100).toLocaleString()}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.04)' }}
                  contentStyle={{
                    fontSize: 11,
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    borderRadius: 8,
                    background: isDark ? '#0c0c12' : '#ffffff',
                    border: isDark ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(16, 185, 129, 0.10)',
                    boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.08)',
                    color: isDark ? '#e4e4ec' : '#0c0c12',
                  }}
                  formatter={(value) => ['$' + (Number(value) / 100).toLocaleString(), 'Spend']}
                />
                <Bar
                  dataKey="totalCents"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  style={{ filter: isDark ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.3))' : 'none' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
