import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Inbox, Send, AlertTriangle, CheckCircle, Globe, Mail, MessageSquare } from 'lucide-react'
import type { DeliveryStats } from '@/lib/queries/dashboard'

type ChannelHealth = 'inactive' | 'healthy' | 'degraded' | 'critical'

function getChannelHealth(total: number, failed: number): ChannelHealth {
  if (total === 0) return 'inactive'
  if (failed === 0) return 'healthy'
  if (failed / total < 0.25) return 'degraded'
  return 'critical'
}

const healthConfig: Record<ChannelHealth, { color: string; label: string }> = {
  inactive: { color: 'bg-muted-foreground/50', label: 'No data' },
  healthy: { color: 'bg-emerald-400', label: 'Healthy' },
  degraded: { color: 'bg-amber-400', label: 'Degraded' },
  critical: { color: 'bg-red-400', label: 'Critical' },
}

const channelConfig = [
  { key: 'crm_webhook' as const, display: 'Webhook', icon: Globe },
  { key: 'email' as const, display: 'Email', icon: Mail },
  { key: 'sms' as const, display: 'SMS', icon: MessageSquare },
]

export function DeliveryStatsCards({ data }: { data: DeliveryStats }) {
  const successRate = data.total > 0
    ? Math.round(((data.total - data.failed) / data.total) * 100)
    : 100

  const topCards = [
    {
      title: 'Leads Today',
      value: data.leads.received,
      subtitle: `${data.leads.assigned} assigned, ${data.leads.unassigned} unassigned`,
      icon: Inbox,
      iconColor: 'text-blue-400',
      glowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.06)]',
    },
    {
      title: 'Deliveries',
      value: data.total,
      subtitle: `${data.sent} sent today`,
      icon: Send,
      iconColor: 'text-emerald-400',
      glowColor: 'shadow-[0_0_20px_rgba(34,197,94,0.06)]',
    },
    {
      title: 'Failed',
      value: data.failed,
      subtitle: 'across all channels',
      icon: AlertTriangle,
      iconColor: data.failed > 0 ? 'text-red-400' : 'text-muted-foreground',
      glowColor: data.failed > 0 ? 'shadow-[0_0_20px_rgba(239,68,68,0.08)]' : '',
      highlight: data.failed > 0,
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      subtitle: 'delivery success',
      icon: CheckCircle,
      iconColor: successRate >= 90 ? 'text-emerald-400' : successRate >= 75 ? 'text-amber-400' : 'text-red-400',
      glowColor: successRate >= 90
        ? 'shadow-[0_0_20px_rgba(34,197,94,0.06)]'
        : successRate >= 75
          ? 'shadow-[0_0_20px_rgba(245,158,11,0.08)]'
          : 'shadow-[0_0_20px_rgba(239,68,68,0.08)]',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Delivery Health</span>
        <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/10 to-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card) => (
          <Card
            key={card.title}
            className={`${card.glowColor} ${card.highlight ? '!border-red-500/20' : ''}`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`size-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                {card.value}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channelConfig.map((ch) => {
          const stats = data.channels[ch.key]
          const health = getChannelHealth(stats.total, stats.failed)
          const cfg = healthConfig[health]

          return (
            <Card key={ch.key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full inline-block ${cfg.color}`} />
                  <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {ch.display}
                  </CardTitle>
                </div>
                <ch.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                  {stats.total}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {stats.failed > 0 ? `${stats.failed} failed` : cfg.label}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
