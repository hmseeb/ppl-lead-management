export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Button } from '@/components/ui/button'
import { BrokersTable } from '@/components/brokers/brokers-table'
import { BrokersFilters } from '@/components/brokers/brokers-filters'
import { fetchBrokersWithStats } from '@/lib/queries/brokers'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getRole, getMarketerBrokerIds } from '@/lib/auth/role'

export default async function BrokersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const perPage = 50
  const role = await getRole()
  const brokerIds = role === 'marketer' ? await getMarketerBrokerIds() : undefined

  const { data: brokers, count } = await fetchBrokersWithStats({
    search: params.search || undefined,
    assignment_status: params.assignment_status || undefined,
    onboarding_status: params.onboarding_status || undefined,
    broker_ids: brokerIds,
    page,
    per_page: perPage,
  })
  const totalPages = Math.ceil(count / perPage)
  const brokersWithoutCrm = brokers.filter(
    (b) => !(b.delivery_methods ?? []).includes('crm_webhook')
  )

  function paginationUrl(p: number) {
    const url = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== 'page') url.set(k, v)
    })
    url.set('page', String(p))
    return `/brokers?${url.toString()}`
  }

  return (
    <NuqsAdapter>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Brokers <span className="text-muted-foreground text-base font-normal">({count})</span></h1>
        {role === 'admin' && (
          <Link href="/brokers/new">
            <Button>New Broker</Button>
          </Link>
        )}
      </div>
      <BrokersFilters />
      {brokersWithoutCrm.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium">
              {brokersWithoutCrm.length} broker{brokersWithoutCrm.length > 1 ? 's' : ''} without CRM Webhook enabled
            </p>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              {brokersWithoutCrm.map((b) => `${b.first_name} ${b.last_name}`).join(', ')}
            </p>
          </div>
        </div>
      )}
      <BrokersTable brokers={brokers} />
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
