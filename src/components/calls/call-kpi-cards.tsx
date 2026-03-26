'use client'

import { useState, useCallback } from 'react'
import { useQueryState, parseAsString } from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Phone, PhoneForwarded, CalendarClock, PhoneMissed, Voicemail, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import type { CallKpis } from '@/lib/queries/call-reporting'
import type { CallPreviewType } from '@/lib/actions/calls'
import { fetchCallPreview } from '@/lib/actions/calls'

interface CallKpiCardsProps {
  data: CallKpis
}

type CardConfig = {
  title: string
  key: keyof CallKpis
  icon: typeof Phone
  iconColor: string
  glowColor: string
  borderColor: string
  showPercent: boolean
  previewType: CallPreviewType
}

const cards: CardConfig[] = [
  {
    title: 'Total Calls',
    key: 'totalCalls',
    icon: Phone,
    iconColor: 'text-blue-400',
    glowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.08)]',
    borderColor: 'border-blue-400',
    showPercent: false,
    previewType: 'total_calls',
  },
  {
    title: 'Transferred',
    key: 'transferred',
    icon: PhoneForwarded,
    iconColor: 'text-emerald-400',
    glowColor: 'shadow-[0_0_20px_rgba(34,197,94,0.06)]',
    borderColor: 'border-emerald-400',
    showPercent: true,
    previewType: 'transferred',
  },
  {
    title: 'Callbacks Booked',
    key: 'callbacksBooked',
    icon: CalendarClock,
    iconColor: 'text-violet-400',
    glowColor: 'shadow-[0_0_20px_rgba(139,92,246,0.06)]',
    borderColor: 'border-violet-400',
    showPercent: true,
    previewType: 'callbacks_booked',
  },
  {
    title: 'No Answer',
    key: 'noAnswer',
    icon: PhoneMissed,
    iconColor: 'text-amber-400',
    glowColor: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    borderColor: 'border-amber-400',
    showPercent: true,
    previewType: 'no_answer',
  },
  {
    title: 'Voicemail',
    key: 'voicemail',
    icon: Voicemail,
    iconColor: 'text-rose-400',
    glowColor: 'shadow-[0_0_20px_rgba(244,63,94,0.08)]',
    borderColor: 'border-rose-400',
    showPercent: true,
    previewType: 'voicemail',
  },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return format(new Date(dateStr), 'MMM d, h:mm a')
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatOutcome(outcome: string) {
  switch (outcome) {
    case 'transferred': return 'Transferred'
    case 'callback_booked': return 'Callback Booked'
    case 'no_answer': return 'No Answer'
    case 'voicemail': return 'Voicemail'
    default: return outcome
  }
}

export function CallKpiCards({ data }: CallKpiCardsProps) {
  const [expandedCard, setExpandedCard] = useState<CallPreviewType | null>(null)
  const [previewData, setPreviewData] = useState<Record<string, any[] | null>>({})
  const [loading, setLoading] = useState(false)

  const [datePreset] = useQueryState('date_preset', parseAsString.withDefault(''))
  const [dateFrom] = useQueryState('date_from', parseAsString.withDefault(''))
  const [dateTo] = useQueryState('date_to', parseAsString.withDefault(''))
  const [brokerId] = useQueryState('broker_id', parseAsString.withDefault(''))

  const handleCardClick = useCallback(
    async (card: CardConfig) => {
      if (expandedCard === card.previewType) {
        setExpandedCard(null)
        return
      }

      setExpandedCard(card.previewType)

      // Build filters from current URL params
      const filters = {
        date_preset: datePreset || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        broker_id: brokerId || undefined,
      }

      // Always re-fetch to respect current filters
      setLoading(true)
      try {
        const result = await fetchCallPreview(card.previewType, filters)
        setPreviewData((prev) => ({ ...prev, [card.previewType]: result }))
      } finally {
        setLoading(false)
      }
    },
    [expandedCard, datePreset, dateFrom, dateTo, brokerId]
  )

  const currentData = expandedCard ? previewData[expandedCard] : null
  const isExpanded = expandedCard !== null
  const showOutcomeColumn = expandedCard === 'total_calls'

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const value = data[card.key]
          const percent = card.showPercent && data.totalCalls > 0
            ? Math.round((value / data.totalCalls) * 100)
            : null

          return (
            <div
              key={card.key}
              onClick={() => handleCardClick(card)}
              className="cursor-pointer"
            >
              <Card
                className={`h-full transition-all duration-200 ${card.glowColor} ${
                  expandedCard === card.previewType
                    ? `border-b-2 ${card.borderColor}`
                    : ''
                } hover:scale-[1.02]`}
              >
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
            </div>
          )
        })}
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] mt-4' : 'max-h-0'
        }`}
      >
        {isExpanded && (
          <Card className="p-4">
            {loading && !currentData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : currentData && currentData.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                No data found
              </div>
            ) : currentData ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Lead</TableHead>
                    <TableHead className="text-xs">Broker</TableHead>
                    {showOutcomeColumn && (
                      <TableHead className="text-xs">Outcome</TableHead>
                    )}
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((row: any) => {
                    const lead = row.leads as { first_name: string | null; last_name: string | null } | null
                    const broker = row.brokers as { first_name: string; last_name: string } | null
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs">
                          {lead ? `${lead.first_name} ${lead.last_name}` : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {broker ? `${broker.first_name} ${broker.last_name}` : '-'}
                        </TableCell>
                        {showOutcomeColumn && (
                          <TableCell className="text-xs">{formatOutcome(row.outcome)}</TableCell>
                        )}
                        <TableCell className="text-xs">{formatDuration(row.duration)}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {row.notes || '-'}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(row.created_at)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : null}
          </Card>
        )}
      </div>
    </div>
  )
}
