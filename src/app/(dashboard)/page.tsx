export const dynamic = 'force-dynamic'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { fetchKpis, fetchRecentActivity, fetchLeadVolume, fetchDeliveryStats } from '@/lib/queries/dashboard'
import { fetchBrokersForFilter } from '@/lib/queries/leads'
import { getPreviousDateRange } from '@/lib/types/dashboard-filters'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { DeliveryStatsCards } from '@/components/dashboard/delivery-stats-cards'
import { LeadVolumeChart } from '@/components/dashboard/lead-volume-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardFilters } from '@/components/dashboard/dashboard-filters'
import type { DashboardFilters as DashboardFiltersType } from '@/lib/types/dashboard-filters'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams

  const filters: DashboardFiltersType = {
    date_preset: params.date_preset || undefined,
    date_from: params.date_from || undefined,
    date_to: params.date_to || undefined,
    broker_id: params.broker_id || undefined,
    vertical: params.vertical || undefined,
    compare: params.compare || undefined,
  }

  const isCompare = !!filters.compare

  const [kpis, activity, volume, deliveryStats, brokers] = await Promise.all([
    fetchKpis(filters),
    fetchRecentActivity(filters),
    fetchLeadVolume(filters),
    fetchDeliveryStats(filters),
    fetchBrokersForFilter(),
  ])

  let previousKpis = null
  if (isCompare) {
    const prevRange = getPreviousDateRange(filters)
    const previousFilters: DashboardFiltersType = {
      ...filters,
      date_from: prevRange.from.split('T')[0],
      date_to: prevRange.to.split('T')[0],
      date_preset: undefined,
      compare: undefined,
    }
    previousKpis = await fetchKpis(previousFilters)
  }

  return (
    <NuqsAdapter>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <div className="h-px flex-1 bg-gradient-to-r from-red-500/10 to-transparent" />
        </div>
        <DashboardFilters brokers={brokers} />
        <KpiCards data={kpis} previousData={previousKpis} />
        <DeliveryStatsCards data={deliveryStats} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadVolumeChart data={volume.data} bucketType={volume.bucketType} totalDays={volume.totalDays} />
          <ActivityFeed activity={activity as Parameters<typeof ActivityFeed>[0]['activity']} />
        </div>
      </div>
    </NuqsAdapter>
  )
}
