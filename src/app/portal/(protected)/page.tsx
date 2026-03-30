export const dynamic = 'force-dynamic'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { requireBrokerSession } from '@/lib/portal/guard'
import {
  getPortalBroker,
  fetchBrokerActiveOrders,
  fetchBrokerRecentLeads,
  fetchBrokerSpendSummary,
  fetchBrokerDeliveryHealth,
  fetchBrokerMonthlySpend,
  fetchBrokerLeadVolumeTrend,
  fetchBrokerAvgCreditScore,
  fetchBrokerCreditTierDistribution,
  fetchBrokerVerticalMix,
} from '@/lib/portal/queries'
import {
  fetchPortalCallKpis,
  fetchPortalUpcomingCallbacks,
} from '@/lib/portal/call-queries'
import {
  ActiveOrdersCard,
  RecentLeadsCard,
  SpendSummaryCard,
  DeliveryHealthCard,
} from '@/components/portal/dashboard-cards'
import { SpendTrendChart } from '@/components/portal/spend-trend-chart'
import {
  LeadVolumeTrendChart,
  CallSummaryCard,
  AvgCreditScoreCard,
  NextCallbackCard,
} from '@/components/portal/dashboard-enrichment'
import {
  CompactCreditTiers,
  CompactVerticalMix,
} from '@/components/portal/lead-quality-charts'
import { PortalDateFilters } from '@/components/portal/portal-date-filters'
import type { PortalDateFilters as PortalDateFiltersType } from '@/lib/types/portal-filters'

export default async function PortalHomePage({
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

  const [
    broker,
    activeOrders,
    recentLeads,
    spend,
    deliveryHealth,
    monthlySpend,
    leadVolume,
    avgCredit,
    callKpis,
    upcomingCallbacks,
    creditTiers,
    verticalMix,
  ] = await Promise.all([
    getPortalBroker(brokerId),
    fetchBrokerActiveOrders(brokerId),
    fetchBrokerRecentLeads(brokerId, 20, dateFilters),
    fetchBrokerSpendSummary(brokerId, dateFilters),
    fetchBrokerDeliveryHealth(brokerId, dateFilters),
    fetchBrokerMonthlySpend(brokerId, 12, dateFilters),
    fetchBrokerLeadVolumeTrend(brokerId, dateFilters),
    fetchBrokerAvgCreditScore(brokerId, dateFilters),
    fetchPortalCallKpis(brokerId, dateFilters),
    fetchPortalUpcomingCallbacks(brokerId),
    fetchBrokerCreditTierDistribution(brokerId, dateFilters),
    fetchBrokerVerticalMix(brokerId, dateFilters),
  ])

  return (
    <NuqsAdapter>
      <div className="space-y-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome, {broker?.first_name ?? 'Broker'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here is your dashboard overview.
          </p>
        </div>

        <PortalDateFilters />

        {/* Active Orders - full width */}
        <ActiveOrdersCard orders={activeOrders} />

        {/* Enrichment cards - 3 column compact row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NextCallbackCard callback={upcomingCallbacks[0] ?? null} />
          <AvgCreditScoreCard data={avgCredit} />
          <CallSummaryCard
            kpis={callKpis}
            nextCallback={upcomingCallbacks[0] ?? null}
          />
        </div>

        {/* Lead Quality Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CompactCreditTiers data={creditTiers} />
          <CompactVerticalMix data={verticalMix} />
        </div>

        {/* Spend + Delivery Health - side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SpendSummaryCard spend={spend} />
          <DeliveryHealthCard health={deliveryHealth} />
        </div>

        {/* Lead Volume Trend - full width */}
        <LeadVolumeTrendChart
          data={leadVolume.data}
          bucketType={leadVolume.bucketType}
          totalDays={leadVolume.totalDays}
        />

        {/* Spend Trend - full width */}
        <SpendTrendChart data={monthlySpend} />

        {/* Recent Leads - full width */}
        <RecentLeadsCard leads={recentLeads} />
      </div>
    </NuqsAdapter>
  )
}
