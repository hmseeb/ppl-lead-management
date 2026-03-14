export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { fetchBrokerDetail } from '@/lib/queries/brokers'
import { BrokerForm } from '@/components/brokers/broker-form'
import { type BrokerFormData } from '@/lib/schemas/broker'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default async function EditBrokerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
    <div className="max-w-lg space-y-6">
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
          company_name: broker.company_name ?? '',
          state: broker.state ?? '',
          primary_vertical: (broker.primary_vertical ?? '') as BrokerFormData['primary_vertical'],
          secondary_vertical: (broker.secondary_vertical ?? '') as BrokerFormData['secondary_vertical'],
          batch_size: broker.batch_size,
          deal_amount: broker.deal_amount,
        }}
      />
    </div>
  )
}
