import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, AlertCircle, Activity, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiData {
  leadsToday: number
  leadsThisWeek: number
  leadsThisMonth: number
  assignedCount: number
  unassignedCount: number
  activeBrokers: number
  activeOrders: number
}

export function KpiCards({ data }: { data: KpiData }) {
  const cards = [
    {
      title: 'Leads Today',
      value: data.leadsToday,
      subtitle: `${data.leadsThisWeek} this week / ${data.leadsThisMonth} this month`,
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      title: 'Assigned',
      value: data.assignedCount,
      subtitle: 'Total assigned leads',
      icon: Activity,
      color: 'text-green-600',
    },
    {
      title: 'Unassigned',
      value: data.unassignedCount,
      subtitle: 'Needs attention',
      icon: AlertCircle,
      color: data.unassignedCount > 0 ? 'text-amber-600' : 'text-gray-500',
      highlight: data.unassignedCount > 0,
    },
    {
      title: 'Active Brokers',
      value: data.activeBrokers,
      subtitle: 'Receiving leads',
      icon: Users,
      color: 'text-purple-600',
    },
    {
      title: 'Active Orders',
      value: data.activeOrders,
      subtitle: 'In progress',
      icon: Package,
      color: 'text-indigo-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={cn(card.highlight && 'border-amber-300')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={cn('size-4', card.color)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
