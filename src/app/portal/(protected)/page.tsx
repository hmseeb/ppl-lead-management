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
} from '@/lib/portal/queries'
import {
  ActiveOrdersCard,
  RecentLeadsCard,
  SpendSummaryCard,
  DeliveryHealthCard,
} from '@/components/portal/dashboard-cards'
import { SpendTrendChart } from '@/components/portal/spend-trend-chart'
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

  const [broker, activeOrders, recentLeads, spend, deliveryHealth, monthlySpend] =
    await Promise.all([
      getPortalBroker(brokerId),
      fetchBrokerActiveOrders(brokerId),
      fetchBrokerRecentLeads(brokerId, 20, dateFilters),
      fetchBrokerSpendSummary(brokerId, dateFilters),
      fetchBrokerDeliveryHealth(brokerId, dateFilters),
      fetchBrokerMonthlySpend(brokerId, 12, dateFilters),
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

        {/* Spend + Delivery Health - side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SpendSummaryCard spend={spend} />
          <DeliveryHealthCard health={deliveryHealth} />
        </div>

        {/* Spend Trend - full width */}
        <SpendTrendChart data={monthlySpend} />

        {/* Recent Leads - full width */}
        <RecentLeadsCard leads={recentLeads} />
      </div>
    </NuqsAdapter>
  )
}
