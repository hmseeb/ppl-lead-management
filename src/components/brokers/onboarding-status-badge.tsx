import { cn } from '@/lib/utils'

const statusConfig: Record<string, { style: string; label: string }> = {
  completed: { style: 'badge-glass-green', label: 'Completed' },
  in_progress: { style: 'badge-glass-amber', label: 'In Progress' },
  not_started: { style: 'badge-glass-gray', label: 'Not Started' },
}

export function OnboardingStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.not_started

  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium uppercase tracking-wider',
        config.style
      )}
    >
      {config.label}
    </span>
  )
}
