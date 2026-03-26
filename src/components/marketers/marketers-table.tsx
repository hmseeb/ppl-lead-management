'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { MarketerForm } from './marketer-form'
import { MarketerBrokerAssign } from './marketer-broker-assign'
import { deleteMarketer } from '@/lib/actions/marketers'
import { inviteMarketerToPortal } from '@/lib/actions/marketer-magic-link'
import { Pencil, Trash2, Users, Plus, Mail, Loader2 } from 'lucide-react'

type MarketerRow = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  status: string
  created_at: string
  broker_count: number
  marketer_brokers: { broker_id: string }[]
}

type BrokerOption = {
  id: string
  first_name: string
  last_name: string
  company: string | null
}

interface MarketersTableProps {
  marketers: MarketerRow[]
  allBrokers: BrokerOption[]
}

export function MarketersTable({ marketers, allBrokers }: MarketersTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [brokersId, setBrokersId] = useState<string | null>(null)

  async function handleInvite(marketer: MarketerRow) {
    setInvitingId(marketer.id)
    try {
      const result = await inviteMarketerToPortal(marketer.id)
      if (result && 'error' in result && result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Failed to send invite')
      } else {
        toast.success(`Invite sent to ${marketer.email}`)
      }
    } catch {
      toast.error('Failed to send invite')
    } finally {
      setInvitingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const result = await deleteMarketer(deleteId)
    setDeleting(false)
    setDeleteId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Marketer deleted')
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}><Plus className="size-4 mr-2" />New Marketer</Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Marketer</DialogTitle>
              <DialogDescription>Create a new marketer account</DialogDescription>
            </DialogHeader>
            <MarketerForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {marketers.length === 0 ? (
        <p className="text-muted-foreground">No marketers yet. Create your first one.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Brokers</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marketers.map((marketer) => (
              <TableRow key={marketer.id}>
                <TableCell className="font-medium">
                  {marketer.first_name} {marketer.last_name}
                </TableCell>
                <TableCell>{marketer.email}</TableCell>
                <TableCell>{marketer.phone || '-'}</TableCell>
                <TableCell>
                  <Badge variant={marketer.status === 'active' ? 'default' : 'secondary'}>
                    {marketer.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{marketer.broker_count}</TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(marketer.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* Edit */}
                    <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => setEditId(marketer.id)}>
                      <Pencil className="size-3.5" />
                    </Button>

                    {/* Manage Brokers */}
                    <Button variant="ghost" size="icon-sm" title="Manage Brokers" onClick={() => setBrokersId(marketer.id)}>
                      <Users className="size-3.5" />
                    </Button>

                    {/* Send Invite */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={`Send invite to ${marketer.email}`}
                      onClick={() => handleInvite(marketer)}
                      disabled={invitingId === marketer.id}
                    >
                      {invitingId === marketer.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Mail className="size-3.5" />
                      )}
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(marketer.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) setEditId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Marketer</DialogTitle>
            <DialogDescription>Update marketer details</DialogDescription>
          </DialogHeader>
          {editId && <MarketerForm marketer={marketers.find(m => m.id === editId)!} onSuccess={() => setEditId(null)} />}
        </DialogContent>
      </Dialog>

      {/* Broker assign dialog */}
      <Dialog open={!!brokersId} onOpenChange={(open) => { if (!open) setBrokersId(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Brokers</DialogTitle>
            <DialogDescription>
              {brokersId && `Select brokers for ${marketers.find(m => m.id === brokersId)?.first_name} ${marketers.find(m => m.id === brokersId)?.last_name}`}
            </DialogDescription>
          </DialogHeader>
          {brokersId && <MarketerBrokerAssign
            marketerId={brokersId}
            allBrokers={allBrokers}
            assignedBrokerIds={marketers.find(m => m.id === brokersId)?.marketer_brokers?.map(b => b.broker_id) ?? []}
            onSuccess={() => setBrokersId(null)}
          />}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Marketer</DialogTitle>
            <DialogDescription>
              This will permanently delete this marketer and all broker assignments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
