import { startOfDay, subDays, differenceInMilliseconds } from 'date-fns'

export interface DashboardFilters {
  date_preset?: string
  date_from?: string
  date_to?: string
  broker_id?: string
  vertical?: string
  compare?: string
}

export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
] as const

export const VERTICALS = [
  'MCA',
  'SBA',
  'Equipment Finance',
  'Working Capital',
  'Lines of Credit',
] as const

export function getDateRange(filters: DashboardFilters): { from: string; to: string } {
  const now = new Date()

  if (filters.date_from && filters.date_to) {
    return {
      from: new Date(filters.date_from).toISOString(),
      to: new Date(filters.date_to + 'T23:59:59.999Z').toISOString(),
    }
  }

  if (filters.date_from && !filters.date_to) {
    return {
      from: new Date(filters.date_from).toISOString(),
      to: now.toISOString(),
    }
  }

  const preset = filters.date_preset || 'today'

  switch (preset) {
    case '7d':
      return { from: subDays(now, 7).toISOString(), to: now.toISOString() }
    case '30d':
      return { from: subDays(now, 30).toISOString(), to: now.toISOString() }
    case '90d':
      return { from: subDays(now, 90).toISOString(), to: now.toISOString() }
    case 'today':
    default:
      return { from: startOfDay(now).toISOString(), to: now.toISOString() }
  }
}

export function getPreviousDateRange(filters: DashboardFilters): { from: string; to: string } {
  const current = getDateRange(filters)
  const currentFrom = new Date(current.from)
  const currentTo = new Date(current.to)
  const durationMs = differenceInMilliseconds(currentTo, currentFrom)

  const previousTo = new Date(currentFrom.getTime() - 1)
  const previousFrom = new Date(previousTo.getTime() - durationMs)

  return {
    from: previousFrom.toISOString(),
    to: previousTo.toISOString(),
  }
}
