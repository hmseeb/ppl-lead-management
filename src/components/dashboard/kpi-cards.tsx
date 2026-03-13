'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, TrendingUp, AlertCircle, Activity, Package, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import type { KpiPreviewType } from '@/lib/actions/dashboard'
import {
  fetchLeadsTodayPreview,
  fetchAssignedPreview,
  fetchUnassignedPreview,
  fetchActiveBrokersPreview,
  fetchActiveOrdersPreview,
} from '@/lib/actions/dashboard'

interface KpiData {
  leadsToday: number
  leadsThisWeek: number
  leadsThisMonth: number
  assignedCount: number
  unassignedCount: number
  activeBrokers: number
  activeOrders: number
}

type CardConfig = {
  title: string
  value: number
  subtitle: string
  icon: typeof TrendingUp
  iconColor: string
  glowColor: string
  highlight?: boolean
  previewType: KpiPreviewType
  borderColor: string
  viewAllHref: string
  fetchAction: () => Promise<any[]>
}

export function KpiCards({ data }: { data: KpiData }) {
  const [expandedCard, setExpandedCard] = useState<KpiPreviewType | null>(null)
  const [previewData, setPreviewData] = useState<Record<string, any[] | null>>({})
  const [loading, setLoading] = useState(false)

  const cards: CardConfig[] = [
    {
      title: 'Leads Today',
      value: data.leadsToday,
      subtitle: `${data.leadsThisWeek} this week / ${data.leadsThisMonth} this month`,
      icon: TrendingUp,
      iconColor: 'text-red-400',
      glowColor: 'shadow-[0_0_20px_rgba(220,38,38,0.08)]',
      previewType: 'leads_today',
      borderColor: 'border-red-400',
      viewAllHref: `/leads?date_from=${format(new Date(), 'yyyy-MM-dd')}`,
      fetchAction: fetchLeadsTodayPreview,
    },
    {
      title: 'Assigned',
      value: data.assignedCount,
      subtitle: 'Total assigned leads',
      icon: Activity,
      iconColor: 'text-emerald-400',
      glowColor: 'shadow-[0_0_20px_rgba(34,197,94,0.06)]',
      previewType: 'assigned',
      borderColor: 'border-emerald-400',
      viewAllHref: '/leads?status=assigned',
      fetchAction: fetchAssignedPreview,
    },
    {
      title: 'Unassigned',
      value: data.unassignedCount,
      subtitle: 'Needs attention',
      icon: AlertCircle,
      iconColor: data.unassignedCount > 0 ? 'text-amber-400' : 'text-muted-foreground',
      glowColor: data.unassignedCount > 0 ? 'shadow-[0_0_20px_rgba(245,158,11,0.08)]' : '',
      highlight: data.unassignedCount > 0,
      previewType: 'unassigned',
      borderColor: 'border-amber-400',
      viewAllHref: '/unassigned',
      fetchAction: fetchUnassignedPreview,
    },
    {
      title: 'Active Brokers',
      value: data.activeBrokers,
      subtitle: 'Receiving leads',
      icon: Users,
      iconColor: 'text-violet-400',
      glowColor: 'shadow-[0_0_20px_rgba(139,92,246,0.06)]',
      previewType: 'active_brokers',
      borderColor: 'border-violet-400',
      viewAllHref: '/brokers?status=active',
      fetchAction: fetchActiveBrokersPreview,
    },
    {
      title: 'Active Orders',
      value: data.activeOrders,
      subtitle: 'In progress',
      icon: Package,
      iconColor: 'text-blue-400',
      glowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.06)]',
      previewType: 'active_orders',
      borderColor: 'border-blue-400',
      viewAllHref: '/orders?status=active',
      fetchAction: fetchActiveOrdersPreview,
    },
  ]

  const handleCardClick = useCallback(
    async (card: CardConfig) => {
      if (expandedCard === card.previewType) {
        setExpandedCard(null)
        return
      }

      setExpandedCard(card.previewType)

      if (previewData[card.previewType]) return

      setLoading(true)
      try {
        const result = await card.fetchAction()
        setPreviewData((prev) => ({ ...prev, [card.previewType]: result }))
      } finally {
        setLoading(false)
      }
    },
    [expandedCard, previewData]
  )

  const expandedConfig = expandedCard ? cards.find((c) => c.previewType === expandedCard) : null
  const currentData = expandedCard ? previewData[expandedCard] : null
  const isExpanded = expandedCard !== null

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => handleCardClick(card)}
            className="cursor-pointer"
          >
            <Card
              className={`transition-all duration-200 ${card.glowColor} ${
                card.highlight ? '!border-amber-500/20' : ''
              } ${
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
                  {card.value}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">{card.subtitle}</p>
              </CardContent>
            </Card>
          </div>
        ))}
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
              <div>
                <PreviewTable type={expandedCard!} data={currentData} />
                {expandedConfig && (
                  <div className="flex justify-end mt-3">
                    <Link
                      href={expandedConfig.viewAllHref}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all &rarr;
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        )}
      </div>
    </div>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return format(new Date(dateStr), 'MMM d, h:mm a')
}

function PreviewTable({ type, data }: { type: KpiPreviewType; data: any[] }) {
  switch (type) {
    case 'leads_today':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Phone</TableHead>
              <TableHead className="text-xs">Vertical</TableHead>
              <TableHead className="text-xs">Credit Score</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs">{row.first_name} {row.last_name}</TableCell>
                <TableCell className="text-xs">{row.phone ?? '-'}</TableCell>
                <TableCell className="text-xs">{row.vertical ?? '-'}</TableCell>
                <TableCell className="text-xs">{row.credit_score ?? '-'}</TableCell>
                <TableCell className="text-xs capitalize">{row.status}</TableCell>
                <TableCell className="text-xs">{formatDate(row.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )

    case 'assigned':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Vertical</TableHead>
              <TableHead className="text-xs">Credit Score</TableHead>
              <TableHead className="text-xs">Broker</TableHead>
              <TableHead className="text-xs">Assigned At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => {
              const broker = row.brokers as { first_name: string; last_name: string } | null
              return (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{row.first_name} {row.last_name}</TableCell>
                  <TableCell className="text-xs">{row.vertical ?? '-'}</TableCell>
                  <TableCell className="text-xs">{row.credit_score ?? '-'}</TableCell>
                  <TableCell className="text-xs">
                    {broker ? `${broker.first_name} ${broker.last_name}` : '-'}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(row.assigned_at)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )

    case 'unassigned':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Vertical</TableHead>
              <TableHead className="text-xs">Credit Score</TableHead>
              <TableHead className="text-xs">Reason</TableHead>
              <TableHead className="text-xs">Received At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => {
              const lead = row.leads as { id: string; first_name: string | null; last_name: string | null; vertical: string | null; credit_score: number | null; created_at: string } | null
              return (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">
                    {lead ? `${lead.first_name} ${lead.last_name}` : '-'}
                  </TableCell>
                  <TableCell className="text-xs">{lead?.vertical ?? '-'}</TableCell>
                  <TableCell className="text-xs">{lead?.credit_score ?? '-'}</TableCell>
                  <TableCell className="text-xs">{row.reason}</TableCell>
                  <TableCell className="text-xs">{formatDate(row.created_at)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )

    case 'active_brokers':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Company</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs">{row.first_name} {row.last_name}</TableCell>
                <TableCell className="text-xs">{row.company ?? '-'}</TableCell>
                <TableCell className="text-xs">{row.email}</TableCell>
                <TableCell className="text-xs capitalize">{row.assignment_status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )

    case 'active_orders':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Broker</TableHead>
              <TableHead className="text-xs">Verticals</TableHead>
              <TableHead className="text-xs">Delivered/Total</TableHead>
              <TableHead className="text-xs">Remaining</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => {
              const broker = row.brokers as { first_name: string; last_name: string } | null
              return (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">
                    {broker ? `${broker.first_name} ${broker.last_name}` : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {Array.isArray(row.verticals) ? row.verticals.join(', ') : '-'}
                  </TableCell>
                  <TableCell className="text-xs">{row.leads_delivered}/{row.total_leads}</TableCell>
                  <TableCell className="text-xs">{row.leads_remaining}</TableCell>
                  <TableCell className="text-xs capitalize">{row.status}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )
  }
}
