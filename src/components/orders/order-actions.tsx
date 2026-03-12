'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal, Pause, Play, CheckCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateOrderStatus, toggleBonusMode } from '@/lib/actions/orders'

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

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
