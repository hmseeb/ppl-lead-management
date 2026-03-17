import { requireBrokerSession } from '@/lib/portal/guard'
import { fetchBrokerLeadsPaginated } from '@/lib/portal/queries'
import { LeadsTable } from '@/components/portal/leads-table'

export default async function PortalLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { brokerId } = await requireBrokerSession()
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const perPage = 20

  const { leads, total } = await fetchBrokerLeadsPaginated(brokerId, page, perPage)

  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">My Leads</h1>
        <p className="text-muted-foreground mt-1">
          All leads assigned to you with delivery status.
        </p>
      </div>
      <LeadsTable leads={leads} total={total} page={page} perPage={perPage} />
    </div>
  )
}
