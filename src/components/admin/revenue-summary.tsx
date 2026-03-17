import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Users, BarChart3 } from 'lucide-react'
import type { RevenueSummary } from '@/lib/queries/dashboard'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function RevenueSummarySection({ data }: { data: RevenueSummary }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Revenue</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-red-500/10 to-transparent" />
      </div>

      {/* Total Revenue Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <DollarSign className="size-4 text-emerald-400" />
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">
            {formatCents(data.totalRevenueCents)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            From {data.byBroker.length} broker{data.byBroker.length !== 1 ? 's' : ''} across {data.byVertical.length} vertical{data.byVertical.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Broker */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="size-4 text-blue-400" />
            <CardTitle className="text-sm font-medium">Revenue by Broker</CardTitle>
            <Badge variant="secondary" className="ml-auto text-xs">
              {data.byBroker.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {data.byBroker.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revenue data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.byBroker.map((entry) => {
                  const pct = data.totalRevenueCents > 0
                    ? Math.round((entry.revenueCents / data.totalRevenueCents) * 100)
                    : 0
                  return (
                    <div key={entry.brokerId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{entry.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatCents(entry.revenueCents)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Vertical */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <BarChart3 className="size-4 text-violet-400" />
            <CardTitle className="text-sm font-medium">Revenue by Vertical</CardTitle>
            <Badge variant="secondary" className="ml-auto text-xs">
              {data.byVertical.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {data.byVertical.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revenue data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.byVertical.map((entry) => {
                  const pct = data.totalRevenueCents > 0
                    ? Math.round((entry.revenueCents / data.totalRevenueCents) * 100)
                    : 0
                  return (
                    <div key={entry.vertical} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium capitalize">{entry.vertical}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatCents(entry.revenueCents)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
