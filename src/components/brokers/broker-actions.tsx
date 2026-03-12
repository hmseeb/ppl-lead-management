'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateBrokerStatus } from '@/lib/actions/brokers'

interface BrokerActionsProps {
  brokerId: string
  currentStatus: string
}

const statuses = ['active', 'paused', 'completed'] as const

export function BrokerActions({ brokerId, currentStatus }: BrokerActionsProps) {
  const router = useRouter()

  async function handleStatusChange(status: string) {
    const result = await updateBrokerStatus(brokerId, status)
    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to update status')
      return
    }
    toast.success(`Status changed to ${status}`)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Actions</div>
        <DropdownMenuSeparator />
        {statuses
          .filter((s) => s !== currentStatus)
          .map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className="capitalize cursor-pointer"
            >
              Set {status}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
