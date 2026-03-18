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

interface ActivityFiltersProps {
  eventTypes: string[]
  brokers: { id: string; first_name: string; last_name: string }[]
}

export function ActivityFilters({ eventTypes, brokers }: ActivityFiltersProps) {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault('').withOptions(searchSync))
  const [eventType, setEventType] = useQueryState('event_type', parseAsString.withDefault('').withOptions(serverSync))
  const [brokerId, setBrokerId] = useQueryState('broker_id', parseAsString.withDefault('').withOptions(serverSync))
  const [dateFrom, setDateFrom] = useQueryState('date_from', parseAsString.withDefault('').withOptions(serverSync))
  const [dateTo, setDateTo] = useQueryState('date_to', parseAsString.withDefault('').withOptions(serverSync))

  const hasFilters = search || eventType || brokerId || dateFrom || dateTo

  function clearAll() {
    setSearch('')
    setEventType('')
    setBrokerId('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search details..."
          value={search}
          onChange={(e) => setSearch(e.target.value || '')}
        />
      </div>

      <Select value={eventType} onValueChange={(v) => setEventType(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder="All Events" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Events</SelectItem>
          {eventTypes.map((t) => (
            <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={brokerId} onValueChange={(v) => setBrokerId(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder="All Brokers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Brokers</SelectItem>
          {brokers.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.first_name} {b.last_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="w-36"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value || '')}
      />
      <Input
        type="date"
        className="w-36"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value || '')}
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  )
}
