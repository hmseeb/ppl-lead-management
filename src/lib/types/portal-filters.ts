import { startOfDay, subDays } from 'date-fns'

export interface PortalDateFilters {
  date_preset?: string
  date_from?: string
  date_to?: string
}

export const PORTAL_DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
] as const

/**
 * Resolve a PortalDateFilters object into concrete from/to ISO strings.
 * Default preset is '30d' (brokers care about trends more than today's snapshot).
 */
export function getPortalDateRange(filters: PortalDateFilters): { from: string; to: string } {
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

  const preset = filters.date_preset || '30d'

  switch (preset) {
    case 'today':
      return { from: startOfDay(now).toISOString(), to: now.toISOString() }
    case '7d':
      return { from: subDays(now, 7).toISOString(), to: now.toISOString() }
    case '90d':
      return { from: subDays(now, 90).toISOString(), to: now.toISOString() }
    case '30d':
    default:
      return { from: subDays(now, 30).toISOString(), to: now.toISOString() }
  }
}
