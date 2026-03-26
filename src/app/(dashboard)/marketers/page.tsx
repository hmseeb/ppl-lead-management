export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { getRole } from '@/lib/auth/role'
import { fetchMarketers } from '@/lib/queries/marketers'
import { fetchAllBrokersForAssignment } from '@/lib/queries/marketers'
import { MarketersTable } from '@/components/marketers/marketers-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default async function MarketersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const role = await getRole()
  if (role !== 'admin') redirect('/')

  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const perPage = 50

  const [{ data: marketers, count }, allBrokers] = await Promise.all([
    fetchMarketers({
      search: params.search || undefined,
      status: params.status || undefined,
      page,
      per_page: perPage,
    }),
    fetchAllBrokersForAssignment(),
  ])

  const totalPages = Math.ceil(count / perPage)

  function paginationUrl(p: number) {
    const url = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== 'page') url.set(k, v)
    })
    url.set('page', String(p))
    return `/marketers?${url.toString()}`
  }

  return (
    <NuqsAdapter>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            Marketers <span className="text-muted-foreground text-base font-normal">({count})</span>
          </h1>
        </div>
        <MarketersTable marketers={marketers as any} allBrokers={allBrokers as any} />
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
