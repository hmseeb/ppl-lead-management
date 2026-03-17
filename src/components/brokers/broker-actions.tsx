'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { MoreHorizontal, Webhook, Loader2, Mail, MessageSquare } from 'lucide-react'
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
  hasGhlContact?: boolean
  deliveryMethods?: string[]
}

const statuses = ['active', 'paused', 'completed'] as const

export function BrokerActions({
  brokerId,
  currentStatus,
  hasWebhook,
  hasGhlContact,
  deliveryMethods = [],
}: BrokerActionsProps) {
  const router = useRouter()
  const [sendingWebhook, setSendingWebhook] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)

  const showTestEmail = hasGhlContact && deliveryMethods.includes('email')
  const showTestSms = hasGhlContact && deliveryMethods.includes('sms')
  const hasTestActions = hasWebhook || showTestEmail || showTestSms

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

  async function handleTestGhl(channel: 'email' | 'sms') {
    const setter = channel === 'email' ? setSendingEmail : setSendingSms
    setter(true)
    try {
      const res = await fetch(`/api/brokers/${brokerId}/test-ghl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || `Test ${channel} failed`)
        return
      }

      toast.success(`Test ${channel.toUpperCase()} sent successfully`)
    } catch {
      toast.error('Network error')
    } finally {
      setter(false)
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
        {hasTestActions && (
          <>
            <DropdownMenuSeparator />
            <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Test Delivery</div>
          </>
        )}
        {hasWebhook && (
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
        )}
        {showTestEmail && (
          <DropdownMenuItem
            onClick={() => handleTestGhl('email')}
            disabled={sendingEmail}
            className="cursor-pointer"
          >
            {sendingEmail ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Mail className="size-4 mr-1.5" />
            )}
            Test Email
          </DropdownMenuItem>
        )}
        {showTestSms && (
          <DropdownMenuItem
            onClick={() => handleTestGhl('sms')}
            disabled={sendingSms}
            className="cursor-pointer"
          >
            {sendingSms ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <MessageSquare className="size-4 mr-1.5" />
            )}
            Test SMS
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
