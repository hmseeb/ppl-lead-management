import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import type { UpcomingCallback } from '@/lib/queries/call-reporting'

interface UpcomingCallbacksProps {
  callbacks: UpcomingCallback[]
}

export function UpcomingCallbacks({ callbacks }: UpcomingCallbacksProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Upcoming Callbacks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {callbacks.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No upcoming callbacks
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Lead</TableHead>
                <TableHead className="text-xs">Broker</TableHead>
                <TableHead className="text-xs">Scheduled Time</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callbacks.map((cb) => (
                <TableRow key={cb.id}>
                  <TableCell className="text-xs">
                    {cb.lead ? `${cb.lead.first_name} ${cb.lead.last_name}` : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {cb.broker ? `${cb.broker.first_name} ${cb.broker.last_name}` : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(cb.scheduled_time), 'MMM d, h:mm a')}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="capitalize text-amber-500 font-medium">
                      {cb.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
