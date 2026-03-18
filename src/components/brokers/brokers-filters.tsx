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

      <Select value={assignmentStatus} onValueChange={(v) => setAssignmentStatus(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>

      <Select value={onboardingStatus} onValueChange={(v) => setOnboardingStatus(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder="All Onboarding" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Onboarding</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="not_started">Not Started</SelectItem>
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
