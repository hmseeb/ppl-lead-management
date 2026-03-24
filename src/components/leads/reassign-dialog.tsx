'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { reassignLeads } from '@/lib/actions/leads'

interface ReassignDialogProps {
  selectedLeadIds: string[]
  onComplete: () => void
  disabled?: boolean
}

export function ReassignDialog({ selectedLeadIds, onComplete, disabled }: ReassignDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const count = selectedLeadIds.length

  async function handleConfirm() {
    setLoading(true)
    const result = await reassignLeads(selectedLeadIds)
    setLoading(false)

    if ('error' in result && result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Reassignment failed')
      return
    }

    if ('reassigned' in result) {
      toast.success(`${result.reassigned} reassigned, ${result.unassigned} unassigned`)
    }

    setOpen(false)
    onComplete()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" disabled={disabled} />}>
        <RotateCcw className="mr-2 h-4 w-4" />
        Reassign Selected ({count})
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Leads</DialogTitle>
          <DialogDescription>
            {count} {count === 1 ? 'lead' : 'leads'} will be removed from their current broker and sent back through the routing engine.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Original broker&apos;s delivery counts will be adjusted.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Reassigning...' : `Reassign ${count} Leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
