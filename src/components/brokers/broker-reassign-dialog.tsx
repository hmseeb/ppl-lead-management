'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { reassignLeads } from '@/lib/actions/leads'
import { format } from 'date-fns'

interface BrokerReassignDialogProps {
  brokerName: string
  leads: {
    id: string
    first_name: string | null
    last_name: string | null
    vertical: string | null
    credit_score: number | null
    assigned_at: string | null
    assigned_order_id: string | null
  }[]
  orders: {
    id: string
    verticals: string[]
    status: string
  }[]
}

export function BrokerReassignDialog({ brokerName, leads, orders }: BrokerReassignDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedOrderId && lead.assigned_order_id !== selectedOrderId) return false
      if (dateFrom && lead.assigned_at && lead.assigned_at < dateFrom) return false
      if (dateTo && lead.assigned_at && lead.assigned_at > `${dateTo}T23:59:59.999Z`) return false
      return true
    })
  }, [leads, selectedOrderId, dateFrom, dateTo])

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)))
    } else {
      setSelectedLeadIds(new Set())
    }
  }

  function toggleLead(id: string) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    if (selectedLeadIds.size === 0) {
      toast.error('No leads selected')
      return
    }
    setLoading(true)
    const result = await reassignLeads(Array.from(selectedLeadIds))
    setLoading(false)

    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Reassignment failed')
      return
    }

    if ('reassigned' in result) {
      toast.success(`${result.reassigned} reassigned, ${result.unassigned} to unassigned queue`)
    }

    setOpen(false)
    setSelectedLeadIds(new Set())
    setSelectedOrderId('')
    setDateFrom('')
    setDateTo('')
    router.refresh()
  }

  const allSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedLeadIds.has(l.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" disabled={leads.length === 0} />}>
        <RotateCcw className="size-4 mr-1" /> Reassign Leads
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Reassign Leads from {brokerName}</DialogTitle>
          <DialogDescription>
            Select leads to send back through the routing engine. Delivery counts will be adjusted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium text-muted-foreground">Order</label>
            <Select value={selectedOrderId} onValueChange={(v) => { setSelectedOrderId(v ?? ''); setSelectedLeadIds(new Set()) }}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="All orders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All orders</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.id.slice(0, 8)} — {(o.verticals as string[]).join(', ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Assigned after</label>
            <input type="date" className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setSelectedLeadIds(new Set()) }} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Assigned before</label>
            <input type="date" className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setSelectedLeadIds(new Set()) }} />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredLeads.length} leads match filters, {selectedLeadIds.size} selected
        </div>

        <div className="flex-1 overflow-y-auto border rounded-md">
          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="p-2 w-10">
                  <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                </th>
                <th className="p-2 text-left font-medium">Name</th>
                <th className="p-2 text-left font-medium w-20">Vertical</th>
                <th className="p-2 text-left font-medium w-16">Credit</th>
                <th className="p-2 text-left font-medium w-28">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => toggleLead(lead.id)}>
                  <td className="p-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedLeadIds.has(lead.id)} onCheckedChange={() => toggleLead(lead.id)} />
                  </td>
                  <td className="p-2">{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'}</td>
                  <td className="p-2">
                    {lead.vertical ? <Badge variant="secondary" className="text-xs">{lead.vertical}</Badge> : '-'}
                  </td>
                  <td className="p-2">{lead.credit_score ?? '-'}</td>
                  <td className="p-2">{lead.assigned_at ? format(new Date(lead.assigned_at), 'MMM d, h:mm a') : '-'}</td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">No leads match filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={selectedLeadIds.size === 0 || loading}>
            {loading ? 'Reassigning...' : `Reassign ${selectedLeadIds.size} Leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
