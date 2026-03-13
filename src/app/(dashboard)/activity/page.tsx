export const dynamic = 'force-dynamic'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { fetchActivityLog, fetchEventTypes, fetchBrokersForActivityFilter } from '@/lib/queries/activity'
import { ActivityFilters } from '@/components/activity/activity-filters'
import { ActivityLogTable } from '@/components/activity/activity-log-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const perPage = 50

  const [{ data, count }, eventTypes, brokers] = await Promise.all([
    fetchActivityLog({
      search: params.search || undefined,
      event_type: params.event_type || undefined,
      broker_id: params.broker_id || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      page,
      per_page: perPage,
    }),
    fetchEventTypes(),
    fetchBrokersForActivityFilter(),
  ])

  const totalPages = Math.ceil(count / perPage)

  function paginationUrl(p: number) {
    const url = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== 'page') url.set(k, v)
    })
    url.set('page', String(p))
    return `/activity?${url.toString()}`
  }

  return (
    <NuqsAdapter>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">
          Activity Log <span className="text-muted-foreground text-base font-normal">({count})</span>
        </h1>
        <ActivityFilters eventTypes={eventTypes} brokers={brokers} />
        <ActivityLogTable data={data as any} />
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
