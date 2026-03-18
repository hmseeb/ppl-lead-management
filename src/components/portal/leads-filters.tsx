'use client'

import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { X } from 'lucide-react'

const VERTICALS = ['MCA', 'SBA', 'Equipment Finance', 'Working Capital', 'Lines of Credit']

const DELIVERY_STATUSES = [
  { value: 'sent', label: 'Sent' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'queued', label: 'Queued' },
  { value: 'failed', label: 'Failed' },
]

const serverSync = { shallow: false } as const
const searchSync = { shallow: false, throttleMs: 300 } as const

export function LeadsFilters() {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault('').withOptions(searchSync))
  const [vertical, setVertical] = useQueryState('vertical', parseAsString.withDefault('').withOptions(serverSync))
  const [deliveryStatus, setDeliveryStatus] = useQueryState('delivery_status', parseAsString.withDefault('').withOptions(serverSync))
  const [, setPage] = useQueryState('page', parseAsInteger.withOptions({ shallow: false }))

  const hasFilters = search || vertical || deliveryStatus

  function handleSearch(value: string) {
    setSearch(value || '')
    setPage(null)
  }

  function handleVertical(value: string | null) {
    setVertical(value ?? '')
    setPage(null)
  }

  function handleDeliveryStatus(value: string | null) {
    setDeliveryStatus(value ?? '')
    setPage(null)
  }

  function clearAll() {
    setSearch('')
    setVertical('')
    setDeliveryStatus('')
    setPage(null)
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <Select value={vertical} onValueChange={handleVertical}>
        <SelectTrigger>
          <SelectValue placeholder="All Verticals" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Verticals</SelectItem>
          {VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={deliveryStatus} onValueChange={handleDeliveryStatus}>
        <SelectTrigger>
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Statuses</SelectItem>
          {DELIVERY_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
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
