'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal, Pause, Play, CheckCircle, Sparkles, Pencil, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateOrderStatus, toggleBonusMode, reorderOrder } from '@/lib/actions/orders'

interface OrderActionsProps {
  orderId: string
  currentStatus: string
  bonusMode: boolean
}

export function OrderActions({ orderId, currentStatus, bonusMode }: OrderActionsProps) {
  const router = useRouter()

  async function handleStatusChange(status: string) {
    const result = await updateOrderStatus(orderId, status)
    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to update status')
      return
    }
    toast.success(`Order ${status === 'active' ? 'resumed' : status}`)
    router.refresh()
  }

  async function handleToggleBonus() {
    const result = await toggleBonusMode(orderId)
    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to toggle bonus mode')
      return
    }
    toast.success(result.bonus_mode ? 'Bonus mode enabled' : 'Bonus mode disabled')
    router.refresh()
  }

  async function handleReorder() {
    const result = await reorderOrder(orderId)
    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to reorder')
      return
    }
    toast.success('New order created from reorder')
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

        {currentStatus !== 'completed' && (
          <DropdownMenuItem onClick={() => router.push(`/orders/${orderId}/edit`)} className="cursor-pointer">
            <Pencil className="size-4 mr-2" />
            Edit Order
          </DropdownMenuItem>
        )}

        {currentStatus === 'active' && (
          <>
            <DropdownMenuItem onClick={() => handleStatusChange('paused')} className="cursor-pointer">
              <Pause className="size-4 mr-2" />
              Pause
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('completed')} className="cursor-pointer">
              <CheckCircle className="size-4 mr-2" />
              Complete
            </DropdownMenuItem>
          </>
        )}

        {currentStatus === 'paused' && (
          <>
            <DropdownMenuItem onClick={() => handleStatusChange('active')} className="cursor-pointer">
              <Play className="size-4 mr-2" />
              Resume
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('completed')} className="cursor-pointer">
              <CheckCircle className="size-4 mr-2" />
              Complete
            </DropdownMenuItem>
          </>
        )}

        {currentStatus === 'completed' && (
          <DropdownMenuItem onClick={handleReorder} className="cursor-pointer">
            <RefreshCw className="size-4 mr-2" />
            Reorder
          </DropdownMenuItem>
        )}

        {currentStatus !== 'completed' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleBonus} className="cursor-pointer">
              <Sparkles className="size-4 mr-2" />
              {bonusMode ? 'Disable Bonus' : 'Enable Bonus'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
