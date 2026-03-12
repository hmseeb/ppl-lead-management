import { fetchUnassignedQueue, fetchActiveBrokersWithOrders } from '@/lib/queries/unassigned'
import { UnassignedTable } from '@/components/unassigned/unassigned-table'

export default async function UnassignedPage() {
  const [queue, brokers] = await Promise.all([
    fetchUnassignedQueue(),
    fetchActiveBrokersWithOrders(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Unassigned Queue{' '}
        <span className="text-muted-foreground text-base font-normal">({queue.length})</span>
      </h1>
      <UnassignedTable queue={queue as any} brokers={brokers as any} />
    </div>
  )
}
