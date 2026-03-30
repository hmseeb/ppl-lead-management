export const dynamic = 'force-dynamic'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { requireBrokerSession } from '@/lib/portal/guard'
import {
  fetchBrokerCreditTierDistribution,
  fetchBrokerVerticalMix,
} from '@/lib/portal/queries'
import {
  CreditScoreHistogram,
  VerticalMixChart,
} from '@/components/portal/lead-quality-charts'
import { PortalDateFilters } from '@/components/portal/portal-date-filters'
import type { PortalDateFilters as PortalDateFiltersType } from '@/lib/types/portal-filters'

export default async function PortalAnalyticsPage({
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

  const [creditTiers, verticalMix] = await Promise.all([
    fetchBrokerCreditTierDistribution(brokerId, dateFilters),
    fetchBrokerVerticalMix(brokerId, dateFilters),
  ])

  return (
    <NuqsAdapter>
      <div className="space-y-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold">Lead Quality Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Understand the credit profile and vertical distribution of your leads.
          </p>
        </div>

        <PortalDateFilters />

        <CreditScoreHistogram data={creditTiers} />

        <VerticalMixChart data={verticalMix} />
      </div>
    </NuqsAdapter>
  )
}
