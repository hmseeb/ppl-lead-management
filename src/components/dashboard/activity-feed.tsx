import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import {
  UserPlus, ShoppingCart, Sparkles,
  AlertTriangle, ArrowRightLeft, Zap, FileText,
} from 'lucide-react'

type ActivityItem = {
  id: string
  event_type: string
  details: unknown
  created_at: string
  broker_id: string | null
  lead_id: string | null
  order_id: string | null
  brokers: { first_name: string; last_name: string } | null
  leads: { first_name: string | null; last_name: string | null } | null
  orders: { id: string } | null
}

const eventConfig: Record<string, { icon: typeof UserPlus; color: string }> = {
  lead_assigned: { icon: UserPlus, color: 'text-emerald-400' },
  lead_received: { icon: FileText, color: 'text-blue-400' },
  order_created: { icon: ShoppingCart, color: 'text-violet-400' },
  order_status_changed: { icon: ArrowRightLeft, color: 'text-blue-400' },
  bonus_mode_toggled: { icon: Sparkles, color: 'text-indigo-400' },
  webhook_failed_permanent: { icon: AlertTriangle, color: 'text-red-400' },
  manual_assignment: { icon: Zap, color: 'text-amber-400' },
  broker_created: { icon: UserPlus, color: 'text-violet-400' },
  broker_status_changed: { icon: ArrowRightLeft, color: 'text-blue-400' },
}

function getDetails(item: ActivityItem) {
  return item.details as Record<string, unknown> | null
}

function formatEvent(item: ActivityItem): string {
  const broker = item.brokers ? `${item.brokers.first_name} ${item.brokers.last_name}` : 'Unknown broker'
  const lead = item.leads?.first_name ? `${item.leads.first_name} ${item.leads.last_name ?? ''}`.trim() : 'a lead'
  const details = getDetails(item)

  switch (item.event_type) {
    case 'lead_assigned':
      return `${lead} assigned to ${broker}`
    case 'lead_received':
      return `New lead received: ${lead}`
    case 'order_created':
      return `New order created for ${broker}`
    case 'order_status_changed': {
      const newStatus = details?.new_status ?? 'unknown'
      return `Order ${newStatus} for ${broker}`
    }
    case 'bonus_mode_toggled': {
      const enabled = details?.bonus_mode ? 'enabled' : 'disabled'
      return `Bonus mode ${enabled} for ${broker}`
    }
    case 'webhook_failed_permanent':
      return `Webhook delivery failed for ${lead}`
    case 'manual_assignment':
      return `${lead} manually assigned to ${broker}`
    case 'broker_created':
      return `New broker created: ${broker}`
    case 'broker_status_changed': {
      const status = details?.new_status ?? 'unknown'
      return `Broker ${broker} set to ${status}`
    }
    default:
      return item.event_type.replace(/_/g, ' ')
  }
}

export function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  const defaultConfig = { icon: FileText, color: 'text-muted-foreground' }

  if (activity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {activity.map((item) => {
            const config = eventConfig[item.event_type] ?? defaultConfig
            const Icon = config.icon
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 text-sm py-2 px-2 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <Icon className={`size-4 mt-0.5 shrink-0 ${config.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground/80 text-xs">{formatEvent(item)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                    {(() => {
                      const d = getDetails(item)
                      if (!d) return null
                      const tags: string[] = []
                      if (d.vertical) tags.push(String(d.vertical))
                      if (d.credit_score) tags.push(`CS ${d.credit_score}`)
                      if (tags.length === 0) return null
                      return tags.map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {t}
                        </span>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
