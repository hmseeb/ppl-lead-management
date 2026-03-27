'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { marketerReassignLead } from '@/lib/actions/leads'

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

interface MarketerReassignDialogProps {
  selectedLeadIds: string[]
  onComplete: () => void
  brokersWithOrders: BrokerWithOrders[]
}

export function MarketerReassignDialog({ selectedLeadIds, onComplete, brokersWithOrders }: MarketerReassignDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedBrokerId, setSelectedBrokerId] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const count = selectedLeadIds.length
  const selectedBroker = brokersWithOrders.find((b) => b.id === selectedBrokerId)
  const availableOrders = selectedBroker?.orders ?? []

  async function handleSubmit() {
    if (!selectedBrokerId || !selectedOrderId) {
      toast.error('Select a broker and order')
      return
    }
    setLoading(true)
    const result = await marketerReassignLead(selectedLeadIds, selectedBrokerId, selectedOrderId)
    setLoading(false)

    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Reassignment failed')
      return
    }

    if ('reassigned' in result) {
      toast.success(`${result.reassigned} reassigned, ${result.failed} failed`)
    }

    setOpen(false)
    setSelectedBrokerId('')
    setSelectedOrderId('')
    onComplete()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="default" />}>
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        Reassign to Broker ({count})
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Leads to Broker</DialogTitle>
          <DialogDescription>
            {count} {count === 1 ? 'lead' : 'leads'} will be moved to the selected broker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Target Broker</label>
            <div className="mt-1">
              <Select value={selectedBrokerId} onValueChange={(v) => { setSelectedBrokerId(v ?? ''); setSelectedOrderId('') }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select broker..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select broker...</SelectItem>
                  {brokersWithOrders.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.first_name} {b.last_name}{b.company ? ` (${b.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedBrokerId && (
            <div>
              <label className="text-sm font-medium">Target Order</label>
              {availableOrders.length > 0 ? (
                <div className="mt-1">
                  <Select value={selectedOrderId} onValueChange={(v) => setSelectedOrderId(v ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select order..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Select order...</SelectItem>
                      {availableOrders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.id.slice(0, 8)} - {(o.verticals as string[]).join(', ')} ({o.leads_remaining} remaining){o.bonus_mode ? ' [BONUS]' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No active orders for this broker</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedBrokerId || !selectedOrderId || loading}>
            {loading ? 'Reassigning...' : `Reassign ${count} Leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
