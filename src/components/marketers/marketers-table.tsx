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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'
import { MarketerForm } from './marketer-form'
import { MarketerBrokerAssign } from './marketer-broker-assign'
import { deleteMarketer } from '@/lib/actions/marketers'
import { Pencil, Trash2, Users, Plus } from 'lucide-react'

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
        <Dialog>
          <DialogTrigger render={<Button><Plus className="size-4 mr-2" />New Marketer</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Marketer</DialogTitle>
              <DialogDescription>Create a new marketer account</DialogDescription>
            </DialogHeader>
            <MarketerForm />
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
                    <Dialog>
                      <DialogTrigger render={
                        <Button variant="ghost" size="icon-sm" title="Edit">
                          <Pencil className="size-3.5" />
                        </Button>
                      } />
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Marketer</DialogTitle>
                          <DialogDescription>Update marketer details</DialogDescription>
                        </DialogHeader>
                        <MarketerForm marketer={marketer} />
                      </DialogContent>
                    </Dialog>

                    {/* Manage Brokers */}
                    <Dialog>
                      <DialogTrigger render={
                        <Button variant="ghost" size="icon-sm" title="Manage Brokers">
                          <Users className="size-3.5" />
                        </Button>
                      } />
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Assign Brokers</DialogTitle>
                          <DialogDescription>
                            Select brokers for {marketer.first_name} {marketer.last_name}
                          </DialogDescription>
                        </DialogHeader>
                        <MarketerBrokerAssign
                          marketerId={marketer.id}
                          allBrokers={allBrokers}
                          assignedBrokerIds={marketer.marketer_brokers?.map(b => b.broker_id) ?? []}
                        />
                      </DialogContent>
                    </Dialog>

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
