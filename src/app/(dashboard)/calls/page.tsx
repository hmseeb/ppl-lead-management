export const dynamic = 'force-dynamic'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { fetchCallKpis, fetchCallOutcomeVolume } from '@/lib/queries/call-reporting'
import { fetchBrokersForFilter } from '@/lib/queries/leads'
import { CallReportingFilters } from '@/components/calls/call-reporting-filters'
import { CallKpiCards } from '@/components/calls/call-kpi-cards'
import { CallOutcomeChart } from '@/components/calls/call-outcome-chart'
import { UpcomingCallbacks } from '@/components/calls/upcoming-callbacks'
import { getRole, getMarketerBrokerIds } from '@/lib/auth/role'
import type { DashboardFilters } from '@/lib/types/dashboard-filters'

export default async function CallReportingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const role = await getRole()
  const brokerIds = role === 'marketer' ? await getMarketerBrokerIds() : undefined

  const filters: DashboardFilters = {
    date_preset: params.date_preset || undefined,
    date_from: params.date_from || undefined,
    date_to: params.date_to || undefined,
    broker_id: params.broker_id || undefined,
  }

  const [kpis, volume, brokers] = await Promise.all([
    fetchCallKpis(filters, brokerIds),
    fetchCallOutcomeVolume(filters, brokerIds),
    fetchBrokersForFilter(brokerIds),
  ])

  return (
    <NuqsAdapter>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Call Reporting</h1>
          <div className="h-px flex-1 bg-gradient-to-r from-red-500/10 to-transparent" />
        </div>
        <CallReportingFilters brokers={brokers} />
        <CallKpiCards data={kpis} />
        <CallOutcomeChart data={volume.data} bucketType={volume.bucketType} totalDays={volume.totalDays} />
        <UpcomingCallbacks />
      </div>
    </NuqsAdapter>
  )
}
