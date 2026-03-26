'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { assignBrokersToMarketer } from '@/lib/actions/marketers'
import { Search } from 'lucide-react'

type BrokerOption = {
  id: string
  first_name: string
  last_name: string
  company: string | null
}

interface MarketerBrokerAssignProps {
  marketerId: string
  allBrokers: BrokerOption[]
  assignedBrokerIds: string[]
}

export function MarketerBrokerAssign({
  marketerId,
  allBrokers,
  assignedBrokerIds,
}: MarketerBrokerAssignProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedBrokerIds))
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = allBrokers.filter((broker) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      broker.first_name.toLowerCase().includes(term) ||
      broker.last_name.toLowerCase().includes(term) ||
      (broker.company?.toLowerCase().includes(term) ?? false)
    )
  })

  function toggle(brokerId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(brokerId)) {
        next.delete(brokerId)
      } else {
        next.add(brokerId)
      }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const result = await assignBrokersToMarketer(marketerId, [...selected])
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selected.size} broker${selected.size !== 1 ? 's' : ''} assigned`)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search brokers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {selected.size} broker{selected.size !== 1 ? 's' : ''} selected
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No brokers found</p>
        ) : (
          filtered.map((broker) => (
            <label
              key={broker.id}
              className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selected.has(broker.id)}
                onCheckedChange={() => toggle(broker.id)}
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">
                  {broker.first_name} {broker.last_name}
                </span>
                {broker.company && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {broker.company}
                  </span>
                )}
              </div>
            </label>
          ))
        )}
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Assignments'}
        </Button>
      </DialogFooter>
    </div>
  )
}
