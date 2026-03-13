export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Button } from '@/components/ui/button'
import { OrdersTable } from '@/components/orders/orders-table'
import { OrdersFilters } from '@/components/orders/orders-filters'
import { fetchOrdersWithBroker } from '@/lib/queries/orders'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const perPage = 50

  const { data: orders, count } = await fetchOrdersWithBroker({
    search: params.search || undefined,
    status: params.status || undefined,
    vertical: params.vertical || undefined,
    page,
    per_page: perPage,
  })
  const totalPages = Math.ceil(count / perPage)

  function paginationUrl(p: number) {
    const url = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== 'page') url.set(k, v)
    })
    url.set('page', String(p))
    return `/orders?${url.toString()}`
  }

  return (
    <NuqsAdapter>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders <span className="text-muted-foreground text-base font-normal">({count})</span></h1>
        <Link href="/orders/new">
          <Button>New Order</Button>
        </Link>
      </div>
      <OrdersFilters />
      <OrdersTable orders={orders as any} />
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
