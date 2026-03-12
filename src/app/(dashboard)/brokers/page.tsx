import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrokersTable } from '@/components/brokers/brokers-table'
import { fetchBrokersWithStats } from '@/lib/queries/brokers'

export default async function BrokersPage() {
  const brokers = await fetchBrokersWithStats()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Brokers <span className="text-muted-foreground text-base font-normal">({brokers.length})</span></h1>
        <Link href="/brokers/new">
          <Button>New Broker</Button>
        </Link>
      </div>
      <BrokersTable brokers={brokers} />
    </div>
  )
}
