import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarClock, Clock } from 'lucide-react'
import { format } from 'date-fns'
import type { PortalUpcomingCallback } from '@/lib/portal/call-queries'

export function UpcomingCallbacks({
  callbacks,
}: {
  callbacks: PortalUpcomingCallback[]
}) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md hover:ring-foreground/15">
      <CardHeader className="flex flex-row items-center gap-2">
        <CalendarClock className="size-4 text-violet-500" />
        <CardTitle className="text-sm font-medium">
          Upcoming Callbacks
        </CardTitle>
        <Badge variant="secondary" className="ml-auto text-xs">
          {callbacks.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {callbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarClock className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming callbacks</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {callbacks.map((cb) => {
              const leadName =
                cb.lead?.first_name || cb.lead?.last_name
                  ? `${cb.lead.first_name ?? ''} ${cb.lead.last_name ?? ''}`.trim()
                  : 'Unknown Lead'

              return (
                <div
                  key={cb.id}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-sm font-medium">{leadName}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {format(new Date(cb.scheduled_time), 'MMM d, h:mm a')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
