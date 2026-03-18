'use client'

import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { X } from 'lucide-react'

const VERTICALS = ['MCA', 'SBA', 'Equipment Finance', 'Working Capital', 'Lines of Credit']

const serverSync = { shallow: false } as const
const searchSync = { shallow: false, throttleMs: 300 } as const

interface LeadsFiltersProps {
  brokers: { id: string; first_name: string; last_name: string }[]
}

export function LeadsFilters({ brokers }: LeadsFiltersProps) {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault('').withOptions(searchSync))
  const [vertical, setVertical] = useQueryState('vertical', parseAsString.withDefault('').withOptions(serverSync))
  const [status, setStatus] = useQueryState('status', parseAsString.withDefault('').withOptions(serverSync))
  const [brokerId, setBrokerId] = useQueryState('broker_id', parseAsString.withDefault('').withOptions(serverSync))
  const [creditMin, setCreditMin] = useQueryState('credit_min', parseAsInteger.withDefault(0).withOptions(serverSync))
  const [creditMax, setCreditMax] = useQueryState('credit_max', parseAsInteger.withDefault(0).withOptions(serverSync))
  const [dateFrom, setDateFrom] = useQueryState('date_from', parseAsString.withDefault('').withOptions(serverSync))
  const [dateTo, setDateTo] = useQueryState('date_to', parseAsString.withDefault('').withOptions(serverSync))

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

      <Select value={vertical} onValueChange={(v) => setVertical(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder="All Verticals" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Verticals</SelectItem>
          {VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => setStatus(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Status</SelectItem>
          <SelectItem value="assigned">Assigned</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
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
