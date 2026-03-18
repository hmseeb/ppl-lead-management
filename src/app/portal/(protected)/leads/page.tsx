export const dynamic = 'force-dynamic'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { requireBrokerSession } from '@/lib/portal/guard'
import { fetchBrokerLeadsPaginated } from '@/lib/portal/queries'
import { LeadsFilters } from '@/components/portal/leads-filters'
import { LeadsTable } from '@/components/portal/leads-table'

export default async function PortalLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { brokerId } = await requireBrokerSession()
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const perPage = 20

  const filters: { search?: string; vertical?: string; deliveryStatus?: string } = {}
  if (params.search) filters.search = params.search
  if (params.vertical) filters.vertical = params.vertical
  if (params.delivery_status) filters.deliveryStatus = params.delivery_status

  const { leads, total } = await fetchBrokerLeadsPaginated(brokerId, page, perPage, filters)

  return (
    <NuqsAdapter>
      <div className="space-y-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold">My Leads</h1>
          <p className="text-muted-foreground mt-1">
            All leads assigned to you with delivery status.
          </p>
        </div>
        <LeadsFilters />
        <LeadsTable leads={leads} total={total} page={page} perPage={perPage} filterParams={params} />
      </div>
    </NuqsAdapter>
  )
}
