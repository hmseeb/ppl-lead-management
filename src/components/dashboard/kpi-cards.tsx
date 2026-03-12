import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, AlertCircle, Activity, Package } from 'lucide-react'

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
      iconColor: 'text-red-400',
      glowColor: 'shadow-[0_0_20px_rgba(220,38,38,0.08)]',
    },
    {
      title: 'Assigned',
      value: data.assignedCount,
      subtitle: 'Total assigned leads',
      icon: Activity,
      iconColor: 'text-emerald-400',
      glowColor: 'shadow-[0_0_20px_rgba(34,197,94,0.06)]',
    },
    {
      title: 'Unassigned',
      value: data.unassignedCount,
      subtitle: 'Needs attention',
      icon: AlertCircle,
      iconColor: data.unassignedCount > 0 ? 'text-amber-400' : 'text-muted-foreground',
      glowColor: data.unassignedCount > 0 ? 'shadow-[0_0_20px_rgba(245,158,11,0.08)]' : '',
      highlight: data.unassignedCount > 0,
    },
    {
      title: 'Active Brokers',
      value: data.activeBrokers,
      subtitle: 'Receiving leads',
      icon: Users,
      iconColor: 'text-violet-400',
      glowColor: 'shadow-[0_0_20px_rgba(139,92,246,0.06)]',
    },
    {
      title: 'Active Orders',
      value: data.activeOrders,
      subtitle: 'In progress',
      icon: Package,
      iconColor: 'text-blue-400',
      glowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.06)]',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`${card.glowColor} ${card.highlight ? '!border-amber-500/20' : ''}`}
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
  )
}
