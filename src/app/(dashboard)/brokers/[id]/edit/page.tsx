export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { fetchBrokerDetail } from '@/lib/queries/brokers'
import { BrokerForm } from '@/components/brokers/broker-form'
import { type BrokerFormData } from '@/lib/schemas/broker'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { getRole } from '@/lib/auth/role'

export default async function EditBrokerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await getRole()
  if (role !== 'admin') redirect('/')

  const { id } = await params
  const result = await fetchBrokerDetail(id)

  if (!result) {
    return (
      <div className="space-y-4">
        <Link href="/brokers"><Button variant="ghost" size="sm"><ChevronLeft className="size-4 mr-1" /> Back to Brokers</Button></Link>
        <p className="text-muted-foreground">Broker not found.</p>
      </div>
    )
  }

  const { broker } = result

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/brokers/${id}`}>
          <Button variant="ghost" size="sm"><ChevronLeft className="size-4 mr-1" /> Back</Button>
        </Link>
        <h1 className="text-2xl font-semibold">Edit Broker</h1>
      </div>
      <BrokerForm
        mode="edit"
        brokerId={id}
        defaultValues={{
          ghl_contact_id: broker.ghl_contact_id ?? '',
          first_name: broker.first_name ?? '',
          last_name: broker.last_name ?? '',
          email: broker.email ?? '',
          phone: broker.phone ?? '',
          company_name: broker.company_name || broker.company || '',
          state: broker.state ?? '',
          primary_vertical: (broker.primary_vertical ?? '') as BrokerFormData['primary_vertical'],
          secondary_vertical: (broker.secondary_vertical ?? '') as BrokerFormData['secondary_vertical'],
          batch_size: broker.batch_size ?? undefined,
          deal_amount: broker.deal_amount ?? undefined,
          delivery_methods: (broker.delivery_methods ?? ['crm_webhook']) as BrokerFormData['delivery_methods'],
          crm_webhook_url: broker.crm_webhook_url ?? '',
          timezone: (broker.timezone ?? '') as BrokerFormData['timezone'],
          contact_hours: (broker.contact_hours ?? 'anytime') as BrokerFormData['contact_hours'],
          custom_hours_start: broker.custom_hours_start ?? '',
          custom_hours_end: broker.custom_hours_end ?? '',
          weekend_pause: broker.weekend_pause ?? false,
          assignment_status: (broker.assignment_status ?? 'active') as BrokerFormData['assignment_status'],
        }}
      />
    </div>
  )
}
