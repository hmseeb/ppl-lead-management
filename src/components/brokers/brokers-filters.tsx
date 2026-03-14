'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const serverSync = { shallow: false } as const
const searchSync = { shallow: false, throttleMs: 300 } as const

export function BrokersFilters() {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault('').withOptions(searchSync))
  const [assignmentStatus, setAssignmentStatus] = useQueryState('assignment_status', parseAsString.withDefault('').withOptions(serverSync))
  const [onboardingStatus, setOnboardingStatus] = useQueryState('onboarding_status', parseAsString.withDefault('').withOptions(serverSync))

  const hasFilters = search || assignmentStatus || onboardingStatus

  function clearAll() {
    setSearch('')
    setAssignmentStatus('')
    setOnboardingStatus('')
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search name, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value || '')}
        />
      </div>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={assignmentStatus}
        onChange={(e) => setAssignmentStatus(e.target.value || '')}
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="suspended">Suspended</option>
      </select>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={onboardingStatus}
        onChange={(e) => setOnboardingStatus(e.target.value || '')}
      >
        <option value="">All Onboarding</option>
        <option value="completed">Completed</option>
        <option value="in_progress">In Progress</option>
        <option value="not_started">Not Started</option>
      </select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  )
}
