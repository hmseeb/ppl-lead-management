import { createAdminClient } from '@/lib/supabase/admin'
import { OrderForm } from '@/components/orders/order-form'

export default async function NewOrderPage() {
  const supabase = createAdminClient()
  const { data: brokers } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, company')
    .eq('assignment_status', 'active')
    .order('first_name')

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">New Order</h1>
      <OrderForm brokers={brokers ?? []} />
    </div>
  )
}
