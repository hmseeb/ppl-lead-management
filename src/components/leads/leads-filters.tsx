'use client'

import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const VERTICALS = ['MCA', 'SBA', 'Equipment Finance', 'Working Capital', 'Lines of Credit']

interface LeadsFiltersProps {
  brokers: { id: string; first_name: string; last_name: string }[]
}

export function LeadsFilters({ brokers }: LeadsFiltersProps) {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault('').withOptions({ throttleMs: 300 }))
  const [vertical, setVertical] = useQueryState('vertical', parseAsString.withDefault(''))
  const [status, setStatus] = useQueryState('status', parseAsString.withDefault(''))
  const [brokerId, setBrokerId] = useQueryState('broker_id', parseAsString.withDefault(''))
  const [creditMin, setCreditMin] = useQueryState('credit_min', parseAsInteger.withDefault(0))
  const [creditMax, setCreditMax] = useQueryState('credit_max', parseAsInteger.withDefault(0))
  const [dateFrom, setDateFrom] = useQueryState('date_from', parseAsString.withDefault(''))
  const [dateTo, setDateTo] = useQueryState('date_to', parseAsString.withDefault(''))

  const hasFilters = search || vertical || status || brokerId || creditMin || creditMax || dateFrom || dateTo

  function clearAll() {
    setSearch('')
    setVertical('')
    setStatus('')
    setBrokerId('')
    setCreditMin(0)
    setCreditMax(0)
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value || '')}
        />
      </div>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={vertical}
        onChange={(e) => setVertical(e.target.value || '')}
      >
        <option value="">All Verticals</option>
        {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value || '')}
      >
        <option value="">All Status</option>
        <option value="assigned">Assigned</option>
        <option value="unassigned">Unassigned</option>
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
        type="number"
        placeholder="Credit min"
        className="w-28"
        value={creditMin || ''}
        onChange={(e) => setCreditMin(e.target.value ? parseInt(e.target.value) : 0)}
      />

      <Input
        type="number"
        placeholder="Credit max"
        className="w-28"
        value={creditMax || ''}
        onChange={(e) => setCreditMax(e.target.value ? parseInt(e.target.value) : 0)}
      />

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
