import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { fetchLeads, fetchBrokersForFilter } from '@/lib/queries/leads'
import { LeadsFilters } from '@/components/leads/leads-filters'
import { LeadsDataTable } from '@/components/leads/leads-data-table'
import { leadsColumns } from '@/components/leads/leads-columns'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const perPage = 50

  const [{ data, count }, brokers] = await Promise.all([
    fetchLeads({
      search: params.search || undefined,
      status: params.status || undefined,
      vertical: params.vertical || undefined,
      broker_id: params.broker_id || undefined,
      credit_score_min: params.credit_min ? parseInt(params.credit_min) : undefined,
      credit_score_max: params.credit_max ? parseInt(params.credit_max) : undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      page,
      per_page: perPage,
    }),
    fetchBrokersForFilter(),
  ])

  const totalPages = Math.ceil(count / perPage)

  // Build pagination URL keeping current filters
  function paginationUrl(p: number) {
    const url = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== 'page') url.set(k, v)
    })
    url.set('page', String(p))
    return `/leads?${url.toString()}`
  }

  return (
    <NuqsAdapter>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Leads <span className="text-muted-foreground text-base font-normal">({count})</span></h1>
        </div>
        <LeadsFilters brokers={brokers} />
        <LeadsDataTable data={data as any} columns={leadsColumns as any} totalCount={count} />
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 ? (
              <Link href={paginationUrl(page - 1)}>
                <Button variant="outline" size="sm"><ChevronLeft className="size-4" /> Previous</Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled><ChevronLeft className="size-4" /> Previous</Button>
            )}
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            {page < totalPages ? (
              <Link href={paginationUrl(page + 1)}>
                <Button variant="outline" size="sm">Next <ChevronRight className="size-4" /></Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>Next <ChevronRight className="size-4" /></Button>
            )}
          </div>
        )}
      </div>
    </NuqsAdapter>
  )
}
