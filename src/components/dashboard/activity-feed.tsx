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
  lead_assigned: { icon: UserPlus, color: 'text-green-600' },
  lead_received: { icon: FileText, color: 'text-blue-600' },
  order_created: { icon: ShoppingCart, color: 'text-purple-600' },
  order_status_changed: { icon: ArrowRightLeft, color: 'text-blue-600' },
  bonus_mode_toggled: { icon: Sparkles, color: 'text-indigo-600' },
  webhook_failed_permanent: { icon: AlertTriangle, color: 'text-red-600' },
  manual_assignment: { icon: Zap, color: 'text-amber-600' },
  broker_created: { icon: UserPlus, color: 'text-purple-600' },
  broker_status_changed: { icon: ArrowRightLeft, color: 'text-blue-600' },
}

function formatEvent(item: ActivityItem): string {
  const broker = item.brokers ? `${item.brokers.first_name} ${item.brokers.last_name}` : 'Unknown broker'
  const lead = item.leads?.first_name ? `${item.leads.first_name} ${item.leads.last_name ?? ''}`.trim() : 'a lead'
  const details = item.details as Record<string, unknown> | null

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
  const defaultConfig = { icon: FileText, color: 'text-gray-500' }

  if (activity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
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
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[300px] overflow-y-auto space-y-3">
          {activity.map((item) => {
            const config = eventConfig[item.event_type] ?? defaultConfig
            const Icon = config.icon
            return (
              <div key={item.id} className="flex items-start gap-3 text-sm">
                <Icon className={`size-4 mt-0.5 shrink-0 ${config.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground">{formatEvent(item)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
