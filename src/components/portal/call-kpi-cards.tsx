import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Phone,
  PhoneForwarded,
  CalendarClock,
  PhoneMissed,
  Voicemail,
} from 'lucide-react'
import type { PortalCallKpis } from '@/lib/portal/call-queries'

type CardConfig = {
  title: string
  key: keyof PortalCallKpis
  icon: typeof Phone
  iconColor: string
  bgTint: string
  showPercent: boolean
}

const cards: CardConfig[] = [
  {
    title: 'Total Calls',
    key: 'totalCalls',
    icon: Phone,
    iconColor: 'text-blue-500',
    bgTint: 'bg-blue-500/5',
    showPercent: false,
  },
  {
    title: 'Transferred',
    key: 'transferred',
    icon: PhoneForwarded,
    iconColor: 'text-emerald-500',
    bgTint: 'bg-emerald-500/5',
    showPercent: true,
  },
  {
    title: 'Callbacks Booked',
    key: 'callbacksBooked',
    icon: CalendarClock,
    iconColor: 'text-violet-500',
    bgTint: 'bg-violet-500/5',
    showPercent: true,
  },
  {
    title: 'No Answer',
    key: 'noAnswer',
    icon: PhoneMissed,
    iconColor: 'text-amber-500',
    bgTint: 'bg-amber-500/5',
    showPercent: true,
  },
  {
    title: 'Voicemail',
    key: 'voicemail',
    icon: Voicemail,
    iconColor: 'text-rose-500',
    bgTint: 'bg-rose-500/5',
    showPercent: true,
  },
]

export function PortalCallKpiCards({ data }: { data: PortalCallKpis }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const value = data[card.key]
        const percent =
          card.showPercent && data.totalCalls > 0
            ? Math.round((value / data.totalCalls) * 100)
            : null

        return (
          <Card key={card.key} className={`h-full ${card.bgTint}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`size-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {value}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {percent !== null ? `${percent}% of total` : 'All outcomes'}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
