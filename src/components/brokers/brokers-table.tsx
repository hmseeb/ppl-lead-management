import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BrokerStatusBadge } from './broker-status-badge'
import { OnboardingStatusBadge } from './onboarding-status-badge'
import { BrokerActions } from './broker-actions'

type BrokerWithStats = {
  id: string
  first_name: string
  last_name: string
  company: string | null
  email: string
  phone: string | null
  assignment_status: string
  status: string
  crm_webhook_url: string | null
  ghl_contact_id: string | null
  delivery_methods: string[] | null
  active_orders_count: number
  total_leads_delivered: number
  last_delivery_date: string | null
}

export function BrokersTable({ brokers }: { brokers: BrokerWithStats[] }) {
  if (brokers.length === 0) {
    return <p className="text-muted-foreground">No brokers yet. Create your first one.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Onboarding</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-right">Active Orders</TableHead>
          <TableHead className="text-right">Leads Delivered</TableHead>
          <TableHead>Last Delivery</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {brokers.map((broker) => (
          <TableRow key={broker.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-1.5">
                <Link href={`/brokers/${broker.id}`} className="hover:underline">
                  {broker.first_name} {broker.last_name}
                </Link>
                {!(broker.delivery_methods ?? []).includes('crm_webhook') && (
                  <span title="CRM Webhook not enabled">
                    <AlertTriangle className="size-4 text-amber-500" />
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>{broker.company || '-'}</TableCell>
            <TableCell>
              <OnboardingStatusBadge status={broker.status} />
            </TableCell>
            <TableCell>{broker.email}</TableCell>
            <TableCell className="text-right">{broker.active_orders_count}</TableCell>
            <TableCell className="text-right">{broker.total_leads_delivered}</TableCell>
            <TableCell>
              {broker.last_delivery_date
                ? formatDistanceToNow(new Date(broker.last_delivery_date), { addSuffix: true })
                : 'Never'}
            </TableCell>
            <TableCell>
              <BrokerStatusBadge status={broker.assignment_status} />
            </TableCell>
            <TableCell>
              <BrokerActions
                brokerId={broker.id}
                currentStatus={broker.assignment_status}
                hasWebhook={!!broker.crm_webhook_url}
                hasGhlContact={!!broker.ghl_contact_id}
                deliveryMethods={broker.delivery_methods ?? []}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
