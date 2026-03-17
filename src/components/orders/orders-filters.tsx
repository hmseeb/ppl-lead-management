'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
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

      <Select value={status || '_all'} onValueChange={(v) => setStatus(v === '_all' ? '' : (v ?? ''))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="paused">Paused</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={vertical || '_all'} onValueChange={(v) => setVertical(v === '_all' ? '' : (v ?? ''))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Verticals</SelectItem>
          {VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
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
