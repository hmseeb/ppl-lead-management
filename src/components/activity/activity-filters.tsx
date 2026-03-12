'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const serverSync = { shallow: false } as const

interface ActivityFiltersProps {
  eventTypes: string[]
  brokers: { id: string; first_name: string; last_name: string }[]
}

export function ActivityFilters({ eventTypes, brokers }: ActivityFiltersProps) {
  const [eventType, setEventType] = useQueryState('event_type', parseAsString.withDefault('').withOptions(serverSync))
  const [brokerId, setBrokerId] = useQueryState('broker_id', parseAsString.withDefault('').withOptions(serverSync))
  const [dateFrom, setDateFrom] = useQueryState('date_from', parseAsString.withDefault('').withOptions(serverSync))
  const [dateTo, setDateTo] = useQueryState('date_to', parseAsString.withDefault('').withOptions(serverSync))

  const hasFilters = eventType || brokerId || dateFrom || dateTo

  function clearAll() {
    setEventType('')
    setBrokerId('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={eventType}
        onChange={(e) => setEventType(e.target.value || '')}
      >
        <option value="">All Events</option>
        {eventTypes.map((t) => (
          <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
        ))}
      </select>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={brokerId}
        onChange={(e) => setBrokerId(e.target.value || '')}
      >
        <option value="">All Brokers</option>
        {brokers.map((b) => (
          <option key={b.id} value={b.id}>{b.first_name} {b.last_name}</option>
        ))}
      </select>

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
