import { createAdminClient } from '@/lib/supabase/admin'

export interface AssignmentResult {
  status: 'assigned' | 'unassigned' | 'error'
  broker_id?: string
  order_id?: string
  delivery_id?: string
  reason?: string
}

export async function assignLead(leadId: string): Promise<AssignmentResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('assign_lead', {
    p_lead_id: leadId,
  })

  if (error) throw new Error(`Assignment failed: ${error.message}`)
  return data as unknown as AssignmentResult
}
