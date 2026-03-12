'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { manualAssignLead } from '@/lib/actions/leads'

type BrokerWithOrders = {
  id: string
  first_name: string
  last_name: string
  company: string | null
  orders: {
    id: string
    verticals: string[]
    leads_remaining: number
    status: string
    bonus_mode: boolean
  }[]
}

interface ManualAssignDialogProps {
  leadId: string
  leadName: string
  leadVertical: string | null
  leadCreditScore: number | null
  brokers: BrokerWithOrders[]
}

export function ManualAssignDialog({ leadId, leadName, leadVertical, leadCreditScore, brokers }: ManualAssignDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedBrokerId, setSelectedBrokerId] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const selectedBroker = brokers.find((b) => b.id === selectedBrokerId)
  const availableOrders = selectedBroker?.orders ?? []

  async function handleSubmit() {
    if (!selectedBrokerId || !selectedOrderId) {
      toast.error('Select a broker and order')
      return
    }
    setLoading(true)
    const result = await manualAssignLead(leadId, selectedBrokerId, selectedOrderId)
    setLoading(false)

    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Assignment failed')
      return
    }

    const brokerName = selectedBroker ? `${selectedBroker.first_name} ${selectedBroker.last_name}` : 'broker'
    toast.success(`${leadName} assigned to ${brokerName}`)
    setOpen(false)
    setSelectedBrokerId('')
    setSelectedOrderId('')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Assign
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Assignment</DialogTitle>
          <DialogDescription>
            Assign <strong>{leadName}</strong> to a broker and order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            {leadVertical && <Badge variant="secondary">{leadVertical}</Badge>}
            {leadCreditScore && <Badge variant="outline">Credit: {leadCreditScore}</Badge>}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Broker</label>
            <select
              className="w-full h-9 mt-1 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedBrokerId}
              onChange={(e) => {
                setSelectedBrokerId(e.target.value)
                setSelectedOrderId('')
              }}
            >
              <option value="">Select broker...</option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.first_name} {b.last_name}{b.company ? ` (${b.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedBrokerId && (
            <div>
              <label className="text-sm font-medium">Order</label>
              {availableOrders.length > 0 ? (
                <select
                  className="w-full h-9 mt-1 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                >
                  <option value="">Select order...</option>
                  {availableOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id.slice(0, 8)} — {(o.verticals as string[]).join(', ')} ({o.leads_remaining} remaining){o.bonus_mode ? ' [BONUS]' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No active orders for this broker</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedBrokerId || !selectedOrderId || loading}>
            {loading ? 'Assigning...' : 'Assign Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
