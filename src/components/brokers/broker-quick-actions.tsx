'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2, Mail, Pause, Pencil, Play, Plus, Webhook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { pauseAllBrokerOrders, resumeAllBrokerOrders } from '@/lib/actions/brokers'
import { inviteBrokerToPortal } from '@/lib/actions/magic-link'

interface BrokerQuickActionsProps {
  brokerId: string
  email: string
  activeOrdersCount: number
  pausedOrdersCount: number
  hasWebhook?: boolean
}

export function BrokerQuickActions({ brokerId, email, activeOrdersCount, pausedOrdersCount, hasWebhook }: BrokerQuickActionsProps) {
  const router = useRouter()
  const [sendingWebhook, setSendingWebhook] = useState(false)
  const [inviting, setInviting] = useState(false)

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

  async function handleInvite() {
    setInviting(true)
    try {
      const result = await inviteBrokerToPortal(brokerId)
      if (result && 'error' in result && result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Failed to send invite')
      } else {
        toast.success(`Portal invite sent to ${email}`)
      }
    } catch {
      toast.error('Failed to send portal invite')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="flex gap-2">
      {hasWebhook && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestWebhook}
          disabled={sendingWebhook}
        >
          {sendingWebhook ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <Webhook className="size-4 mr-1" />
          )}
          Test Webhook
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleInvite}
        disabled={inviting}
        title={`Send portal invite to ${email}`}
      >
        {inviting ? (
          <Loader2 className="size-4 mr-1 animate-spin" />
        ) : (
          <Mail className="size-4 mr-1" />
        )}
        Invite to Portal
      </Button>
      <Link href={`/brokers/${brokerId}/edit`}>
        <Button variant="outline" size="sm">
          <Pencil className="size-4 mr-1" /> Edit
        </Button>
      </Link>
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
