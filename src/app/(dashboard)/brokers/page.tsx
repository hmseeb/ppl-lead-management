import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrokersTable } from '@/components/brokers/brokers-table'

export default function BrokersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Brokers</h1>
        <Link href="/brokers/new">
          <Button>New Broker</Button>
        </Link>
      </div>
      <BrokersTable />
    </div>
  )
}
