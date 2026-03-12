import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

export function BrokerStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('capitalize border-0', statusStyles[status] ?? statusStyles.active)}
    >
      {status}
    </Badge>
  )
}
