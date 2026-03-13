'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const serverSync = { shallow: false } as const
const searchSync = { shallow: false, throttleMs: 300 } as const

export function UnassignedFilters() {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault('').withOptions(searchSync))
  const [reason, setReason] = useQueryState('reason', parseAsString.withDefault('').withOptions(serverSync))

  const hasFilters = search || reason

  function clearAll() {
    setSearch('')
    setReason('')
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search lead name..."
          value={search}
          onChange={(e) => setSearch(e.target.value || '')}
        />
      </div>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={reason}
        onChange={(e) => setReason(e.target.value || '')}
      >
        <option value="">All Reasons</option>
        <option value="no_matching_order">No Matching Order</option>
      </select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  )
}
