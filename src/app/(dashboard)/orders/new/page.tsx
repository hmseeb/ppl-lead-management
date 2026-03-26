export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrderForm } from '@/components/orders/order-form'
import { getRole } from '@/lib/auth/role'

export default async function NewOrderPage() {
  const role = await getRole()
  if (role !== 'admin') redirect('/')
  const supabase = createAdminClient()
  const { data: brokers } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, company, primary_vertical, secondary_vertical')
    .eq('assignment_status', 'active')
    .order('first_name')

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">New Order</h1>
      <OrderForm brokers={brokers ?? []} />
    </div>
  )
}
