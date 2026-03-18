'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
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

      <Select value={reason} onValueChange={(v) => setReason(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder="All Reasons" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Reasons</SelectItem>
          <SelectItem value="no_matching_order">No Matching Order</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  )
}
