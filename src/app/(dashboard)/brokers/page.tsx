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

  function paginationUrl(p: number) {
    const url = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== 'page') url.set(k, v)
    })
    url.set('page', String(p))
    return `/brokers?${url.toString()}`
  }

  const brokersWithoutCrm = brokers.filter((b) => !b.crm_webhook_url)

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
      {brokersWithoutCrm.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="size-5 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <span className="font-medium">{brokersWithoutCrm.length} broker{brokersWithoutCrm.length === 1 ? '' : 's'}</span>{' '}
            {brokersWithoutCrm.length === 1 ? 'does' : 'do'} not have a CRM webhook configured. Leads cannot be delivered via CRM until a webhook URL is set.
          </p>
        </div>
      )}
      <BrokersFilters />
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
