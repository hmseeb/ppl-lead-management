'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { MoreHorizontal, Webhook, Loader2 } from 'lucide-react'
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
  hasWebhook?: boolean
}

const statuses = ['active', 'paused', 'completed'] as const

export function BrokerActions({ brokerId, currentStatus, hasWebhook }: BrokerActionsProps) {
  const router = useRouter()
  const [sendingWebhook, setSendingWebhook] = useState(false)

  async function handleStatusChange(status: string) {
    const result = await updateBrokerStatus(brokerId, status)
    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to update status')
      return
    }
    toast.success(`Status changed to ${status}`)
    router.refresh()
  }

  async function handleTestWebhook() {
    setSendingWebhook(true)
    try {
      const res = await fetch(`/api/brokers/${brokerId}/test-webhook`, {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Webhook test failed')
        return
      }

      toast.success(`Webhook responded with ${data.status}`)
    } catch {
      toast.error('Failed to send test webhook')
    } finally {
      setSendingWebhook(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Actions</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" render={<Link href={`/brokers/${brokerId}/edit`} />}>
          Edit
        </DropdownMenuItem>
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
        {hasWebhook && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleTestWebhook}
              disabled={sendingWebhook}
              className="cursor-pointer"
            >
              {sendingWebhook ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Webhook className="size-4 mr-1.5" />
              )}
              Test Webhook
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
