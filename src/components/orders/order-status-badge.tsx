import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  active: 'badge-glass-green',
  paused: 'badge-glass-amber',
  completed: 'badge-glass-gray',
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium uppercase tracking-wider',
        statusStyles[status] ?? statusStyles.active
      )}
    >
      {status}
    </span>
  )
}

export function BonusBadge() {
  return (
    <span className="badge-glass-blue inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium uppercase tracking-wider">
      Bonus
    </span>
  )
}
