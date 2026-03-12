import { BrokerForm } from '@/components/brokers/broker-form'

export default function NewBrokerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New Broker</h1>
      <BrokerForm mode="create" />
    </div>
  )
}
