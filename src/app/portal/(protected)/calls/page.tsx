export const dynamic = 'force-dynamic'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { requireBrokerSession } from '@/lib/portal/guard'
import {
  fetchPortalCallKpis,
  fetchPortalCallOutcomeVolume,
  fetchPortalUpcomingCallbacks,
} from '@/lib/portal/call-queries'
import { PortalCallKpiCards } from '@/components/portal/call-kpi-cards'
import { PortalCallOutcomeChart } from '@/components/portal/call-outcome-chart'
import { UpcomingCallbacks } from '@/components/portal/upcoming-callbacks'
import { PortalDateFilters } from '@/components/portal/portal-date-filters'
import type { PortalDateFilters as PortalDateFiltersType } from '@/lib/types/portal-filters'

export default async function PortalCallsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { brokerId } = await requireBrokerSession()
  const params = await searchParams

  const dateFilters: PortalDateFiltersType = {
    date_preset: params.date_preset || undefined,
    date_from: params.date_from || undefined,
    date_to: params.date_to || undefined,
  }

  const [kpis, outcomeVolume, upcomingCallbacks] = await Promise.all([
    fetchPortalCallKpis(brokerId, dateFilters),
    fetchPortalCallOutcomeVolume(brokerId, dateFilters),
    fetchPortalUpcomingCallbacks(brokerId),
  ])

  return (
    <NuqsAdapter>
      <div className="space-y-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold">Call Reporting</h1>
          <p className="text-muted-foreground mt-1">
            Track your call activity and upcoming callbacks.
          </p>
        </div>

        <PortalDateFilters />

        <PortalCallKpiCards data={kpis} />

        <PortalCallOutcomeChart
          data={outcomeVolume.data}
          bucketType={outcomeVolume.bucketType}
          totalDays={outcomeVolume.totalDays}
        />

        <UpcomingCallbacks callbacks={upcomingCallbacks} />
      </div>
    </NuqsAdapter>
  )
}
