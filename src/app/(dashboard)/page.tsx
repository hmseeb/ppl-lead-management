export const dynamic = 'force-dynamic'

import { fetchKpis, fetchRecentActivity, fetchLeadVolume7Days, fetchDeliveryStats } from '@/lib/queries/dashboard'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { DeliveryStatsCards } from '@/components/dashboard/delivery-stats-cards'
import { LeadVolumeChart } from '@/components/dashboard/lead-volume-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'

export default async function DashboardPage() {
  const [kpis, activity, volume, deliveryStats] = await Promise.all([
    fetchKpis(),
    fetchRecentActivity(),
    fetchLeadVolume7Days(),
    fetchDeliveryStats(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <div className="h-px flex-1 bg-gradient-to-r from-red-500/10 to-transparent" />
      </div>
      <KpiCards data={kpis} />
      <DeliveryStatsCards data={deliveryStats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadVolumeChart data={volume} />
        <ActivityFeed activity={activity as Parameters<typeof ActivityFeed>[0]['activity']} />
      </div>
    </div>
  )
}
