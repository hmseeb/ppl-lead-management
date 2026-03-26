import { redirect } from 'next/navigation'
import { BrokerForm } from '@/components/brokers/broker-form'
import { getRole } from '@/lib/auth/role'

export default async function NewBrokerPage() {
  const role = await getRole()
  if (role !== 'admin') redirect('/')
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">New Broker</h1>
      <BrokerForm mode="create" />
    </div>
  )
}
