export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrderForm } from '@/components/orders/order-form'
import type { OrderFormData } from '@/lib/schemas/order'
import { getRole } from '@/lib/auth/role'

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await getRole()
  if (role !== 'admin') redirect('/')

  const { id } = await params
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, broker_id, total_leads, verticals, credit_score_min, loan_min, loan_max, priority, order_type, status')
    .eq('id', id)
    .single()

  if (!order || order.status === 'completed') {
    redirect('/orders')
  }

  const { data: brokers } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, company, primary_vertical, secondary_vertical')
    .eq('assignment_status', 'active')
    .order('first_name')

  const initialData: OrderFormData = {
    broker_id: order.broker_id,
    total_leads: order.total_leads,
    verticals: order.verticals as OrderFormData['verticals'],
    credit_score_min: order.credit_score_min,
    loan_min: order.loan_min,
    loan_max: order.loan_max,
    priority: order.priority as 'normal' | 'high',
    order_type: order.order_type as 'one_time' | 'monthly',
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Edit Order</h1>
      <OrderForm brokers={brokers ?? []} orderId={id} initialData={initialData} />
    </div>
  )
}
