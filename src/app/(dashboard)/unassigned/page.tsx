import { fetchUnassignedQueue, fetchActiveBrokersWithOrders } from '@/lib/queries/unassigned'
import { UnassignedTable } from '@/components/unassigned/unassigned-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default async function UnassignedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const perPage = 50

  const [{ data: queue, count }, brokers] = await Promise.all([
    fetchUnassignedQueue({ page, per_page: perPage }),
    fetchActiveBrokersWithOrders(),
  ])

  const totalPages = Math.ceil(count / perPage)

  function paginationUrl(p: number) {
    const url = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== 'page') url.set(k, v)
    })
    url.set('page', String(p))
    return `/unassigned?${url.toString()}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Unassigned Queue{' '}
        <span className="text-muted-foreground text-base font-normal">({count})</span>
      </h1>
      <UnassignedTable queue={queue as any} brokers={brokers as any} />
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
  )
}
