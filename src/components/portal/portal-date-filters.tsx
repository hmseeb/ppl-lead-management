'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { PORTAL_DATE_PRESETS } from '@/lib/types/portal-filters'

const serverSync = { shallow: false } as const

export function PortalDateFilters() {
  const [datePreset, setDatePreset] = useQueryState(
    'date_preset',
    parseAsString.withDefault('').withOptions(serverSync)
  )
  const [dateFrom, setDateFrom] = useQueryState(
    'date_from',
    parseAsString.withDefault('').withOptions(serverSync)
  )
  const [dateTo, setDateTo] = useQueryState(
    'date_to',
    parseAsString.withDefault('').withOptions(serverSync)
  )

  // Default preset is 30d when nothing is set
  const activePreset = datePreset || (!dateFrom && !dateTo ? '30d' : '')

  const isNonDefault = datePreset || dateFrom || dateTo

  function selectPreset(value: string) {
    setDatePreset(value === '30d' ? '' : value)
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
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-border/30">
      {/* Pill-style segmented control */}
      <div className="inline-flex items-center rounded-full bg-muted/50 p-0.5">
        {PORTAL_DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => selectPreset(preset.value)}
            className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all duration-200 ${
              activePreset === preset.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          Custom
        </span>
        <Input
          type="date"
          className="h-7 w-32 text-xs rounded-full border-muted-foreground/20 bg-transparent"
          value={dateFrom}
          onChange={(e) => handleDateFrom(e.target.value)}
        />
        <span className="text-xs text-muted-foreground/40">&ndash;</span>
        <Input
          type="date"
          className="h-7 w-32 text-xs rounded-full border-muted-foreground/20 bg-transparent"
          value={dateTo}
          onChange={(e) => handleDateTo(e.target.value)}
        />
      </div>

      {/* Clear/reset button */}
      {isNonDefault && (
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="size-3" />
          Reset
        </button>
      )}
    </div>
  )
}
