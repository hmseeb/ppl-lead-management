'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useTheme } from 'next-themes'
import { BarChart3, PieChart } from 'lucide-react'
import type { CreditTierDistribution, VerticalMixData } from '@/lib/portal/queries'

const VERTICAL_PALETTE = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#6366f1']

/* ------------------------------------------------------------------ */
/*  Full-size: Credit Score Histogram                                  */
/* ------------------------------------------------------------------ */

export function CreditScoreHistogram({ data }: { data: CreditTierDistribution }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const hasData = data.total > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <BarChart3 className="size-4 text-amber-400" />
        <CardTitle className="text-sm font-medium">Credit Score Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">No scored leads in this period.</p>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tiers}>
                <XAxis
                  dataKey="tier"
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
                  formatter={(value) => [value, 'Leads']}
                  labelFormatter={(label) => `Tier: ${label}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.tiers.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Full-size: Vertical Mix Chart                                      */
/* ------------------------------------------------------------------ */

export function VerticalMixChart({ data }: { data: VerticalMixData }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const hasData = data.total > 0
  const chartHeight = Math.max(200, data.verticals.length * 50)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <PieChart className="size-4 text-blue-400" />
        <CardTitle className="text-sm font-medium">Vertical Mix</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">No lead data in this period.</p>
        ) : (
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.verticals} layout="vertical">
                <XAxis
                  type="number"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: isDark ? '#8b8b9e' : '#64648c' }}
                />
                <YAxis
                  type="category"
                  dataKey="vertical"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={100}
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
                  formatter={(value, _name, props) => {
                    const payload = props?.payload as { vertical: string; percent: number } | undefined
                    return [
                      `${value} (${payload?.percent ?? 0}%)`,
                      payload?.vertical ?? '',
                    ]
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.verticals.map((_entry, i) => (
                    <Cell key={i} fill={VERTICAL_PALETTE[i % VERTICAL_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Compact: Credit Tier Badges                                        */
/* ------------------------------------------------------------------ */

export function CompactCreditTiers({ data }: { data: CreditTierDistribution }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <BarChart3 className="size-4 text-amber-400" />
        <CardTitle className="text-sm font-medium">Credit Score Tiers</CardTitle>
      </CardHeader>
      <CardContent>
        {data.total === 0 ? (
          <p className="text-sm text-muted-foreground">No scored leads</p>
        ) : (
          <div className="flex items-center gap-4">
            {data.tiers.map((tier) => (
              <div key={tier.tier} className="flex items-center gap-2">
                <div
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: tier.color }}
                />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{tier.tier}</span>
                  <span className="text-sm font-semibold tabular-nums">{tier.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Compact: Vertical Mix Bar                                          */
/* ------------------------------------------------------------------ */

export function CompactVerticalMix({ data }: { data: VerticalMixData }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <PieChart className="size-4 text-blue-400" />
        <CardTitle className="text-sm font-medium">Vertical Mix</CardTitle>
      </CardHeader>
      <CardContent>
        {data.total === 0 ? (
          <p className="text-sm text-muted-foreground">No lead data</p>
        ) : (
          <div className="space-y-3">
            {/* Stacked progress bar */}
            <div className="h-3 rounded-full overflow-hidden flex">
              {data.verticals.map((v, i) => (
                <div
                  key={v.vertical}
                  style={{
                    width: `${v.percent}%`,
                    backgroundColor: VERTICAL_PALETTE[i % VERTICAL_PALETTE.length],
                  }}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {data.verticals.map((v, i) => (
                <div key={v.vertical} className="flex items-center gap-1.5">
                  <div
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: VERTICAL_PALETTE[i % VERTICAL_PALETTE.length] }}
                  />
                  <span className="text-xs text-muted-foreground">{v.vertical}</span>
                  <span className="text-xs font-semibold tabular-nums">{v.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
