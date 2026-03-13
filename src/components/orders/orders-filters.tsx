'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const VERTICALS = ['MCA', 'SBA', 'Equipment Finance', 'Working Capital', 'Lines of Credit']

const serverSync = { shallow: false } as const
const searchSync = { shallow: false, throttleMs: 300 } as const

export function OrdersFilters() {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault('').withOptions(searchSync))
  const [status, setStatus] = useQueryState('status', parseAsString.withDefault('').withOptions(serverSync))
  const [vertical, setVertical] = useQueryState('vertical', parseAsString.withDefault('').withOptions(serverSync))

  const hasFilters = search || status || vertical

  function clearAll() {
    setSearch('')
    setStatus('')
    setVertical('')
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search broker name..."
          value={search}
          onChange={(e) => setSearch(e.target.value || '')}
        />
      </div>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value || '')}
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={vertical}
        onChange={(e) => setVertical(e.target.value || '')}
      >
        <option value="">All Verticals</option>
        {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  )
}
