'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pause, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { pauseAllBrokerOrders, resumeAllBrokerOrders } from '@/lib/actions/brokers'

interface BrokerQuickActionsProps {
  brokerId: string
  activeOrdersCount: number
  pausedOrdersCount: number
}

export function BrokerQuickActions({ brokerId, activeOrdersCount, pausedOrdersCount }: BrokerQuickActionsProps) {
  const router = useRouter()

  async function handlePauseAll() {
    const result = await pauseAllBrokerOrders(brokerId)
    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed')
      return
    }
    toast.success('All active orders paused')
    router.refresh()
  }

  async function handleResumeAll() {
    const result = await resumeAllBrokerOrders(brokerId)
    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed')
      return
    }
    toast.success('All paused orders resumed')
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePauseAll}
        disabled={activeOrdersCount === 0}
      >
        <Pause className="size-4 mr-1" /> Pause All ({activeOrdersCount})
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleResumeAll}
        disabled={pausedOrdersCount === 0}
      >
        <Play className="size-4 mr-1" /> Resume All ({pausedOrdersCount})
      </Button>
      <Link href={`/orders/new?broker_id=${brokerId}`}>
        <Button size="sm">
          <Plus className="size-4 mr-1" /> New Order
        </Button>
      </Link>
    </div>
  )
}
