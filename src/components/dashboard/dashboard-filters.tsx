'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, ArrowUpDown } from 'lucide-react'
import { DATE_PRESETS, VERTICALS } from '@/lib/types/dashboard-filters'

const serverSync = { shallow: false } as const

interface DashboardFiltersProps {
  brokers: { id: string; first_name: string; last_name: string }[]
}

export function DashboardFilters({ brokers }: DashboardFiltersProps) {
  const [datePreset, setDatePreset] = useQueryState('date_preset', parseAsString.withDefault('').withOptions(serverSync))
  const [dateFrom, setDateFrom] = useQueryState('date_from', parseAsString.withDefault('').withOptions(serverSync))
  const [dateTo, setDateTo] = useQueryState('date_to', parseAsString.withDefault('').withOptions(serverSync))
  const [brokerId, setBrokerId] = useQueryState('broker_id', parseAsString.withDefault('').withOptions(serverSync))
  const [vertical, setVertical] = useQueryState('vertical', parseAsString.withDefault('').withOptions(serverSync))
  const [compare, setCompare] = useQueryState('compare', parseAsString.withDefault('').withOptions(serverSync))

  const activePreset = datePreset || (!dateFrom && !dateTo ? 'today' : '')

  const hasFilters = datePreset || dateFrom || dateTo || brokerId || vertical || compare

  function selectPreset(value: string) {
    setDatePreset(value === 'today' ? '' : value)
    setDateFrom('')
    setDateTo('')
  }

  function handleDateFrom(value: string) {
    setDateFrom(value || '')
    setDatePreset('')
  }

  function handleDateTo(value: string) {
    setDateTo(value || '')
    setDatePreset('')
  }

  function clearAll() {
    setDatePreset('')
    setDateFrom('')
    setDateTo('')
    setBrokerId('')
    setVertical('')
    setCompare('')
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex rounded-md border border-input overflow-hidden">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => selectPreset(preset.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activePreset === preset.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <Input
        type="date"
        className="w-36"
        value={dateFrom}
        onChange={(e) => handleDateFrom(e.target.value)}
        placeholder="From"
      />

      <Input
        type="date"
        className="w-36"
        value={dateTo}
        onChange={(e) => handleDateTo(e.target.value)}
        placeholder="To"
      />

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

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={vertical}
        onChange={(e) => setVertical(e.target.value || '')}
      >
        <option value="">All Verticals</option>
        {VERTICALS.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      <Button
        variant={compare ? 'default' : 'outline'}
        size="sm"
        onClick={() => setCompare(compare ? '' : 'true')}
        className={compare ? '' : 'text-muted-foreground'}
      >
        <ArrowUpDown className="size-4 mr-1" /> Compare
      </Button>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  )
}
