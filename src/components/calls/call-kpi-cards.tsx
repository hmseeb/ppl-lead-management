'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, PhoneForwarded, CalendarClock, PhoneMissed, Voicemail } from 'lucide-react'
import type { CallKpis } from '@/lib/queries/call-reporting'

interface CallKpiCardsProps {
  data: CallKpis
}

const cards = [
  {
    title: 'Total Calls',
    key: 'totalCalls' as const,
    icon: Phone,
    iconColor: 'text-blue-400',
    glowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.08)]',
    showPercent: false,
  },
  {
    title: 'Transferred',
    key: 'transferred' as const,
    icon: PhoneForwarded,
    iconColor: 'text-emerald-400',
    glowColor: 'shadow-[0_0_20px_rgba(34,197,94,0.06)]',
    showPercent: true,
  },
  {
    title: 'Callbacks Booked',
    key: 'callbacksBooked' as const,
    icon: CalendarClock,
    iconColor: 'text-violet-400',
    glowColor: 'shadow-[0_0_20px_rgba(139,92,246,0.06)]',
    showPercent: true,
  },
  {
    title: 'No Answer',
    key: 'noAnswer' as const,
    icon: PhoneMissed,
    iconColor: 'text-amber-400',
    glowColor: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    showPercent: true,
  },
  {
    title: 'Voicemail',
    key: 'voicemail' as const,
    icon: Voicemail,
    iconColor: 'text-rose-400',
    glowColor: 'shadow-[0_0_20px_rgba(244,63,94,0.08)]',
    showPercent: true,
  },
]

export function CallKpiCards({ data }: CallKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const value = data[card.key]
        const percent = card.showPercent && data.totalCalls > 0
          ? Math.round((value / data.totalCalls) * 100)
          : null

        return (
          <Card key={card.key} className={`${card.glowColor}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`size-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                {value}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {percent !== null ? `${percent}% of total` : 'All outcomes'}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
