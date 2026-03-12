import { fetchKpis, fetchRecentActivity, fetchLeadVolume7Days } from '@/lib/queries/dashboard'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { LeadVolumeChart } from '@/components/dashboard/lead-volume-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'

export default async function DashboardPage() {
  const [kpis, activity, volume] = await Promise.all([
    fetchKpis(),
    fetchRecentActivity(),
    fetchLeadVolume7Days(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <KpiCards data={kpis} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadVolumeChart data={volume} />
        <ActivityFeed activity={activity as Parameters<typeof ActivityFeed>[0]['activity']} />
      </div>
    </div>
  )
}
