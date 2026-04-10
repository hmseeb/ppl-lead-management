'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getRole, getMarketerBrokerIds } from '@/lib/auth/role'

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function field(value: unknown): string {
  if (value == null) return ''
  return escapeCsvField(String(value))
}

export async function exportAllLeadsCsv() {
  const role = await getRole()
  const brokerIds = role === 'marketer' ? await getMarketerBrokerIds() : undefined

  const supabase = createAdminClient()

  let query = supabase
    .from('leads')
    .select(`
      id, first_name, last_name, email, phone, business_name, state,
      vertical, credit_score, funding_amount, funding_purpose,
      status, rejection_reason, ai_call_status, ai_call_notes,
      ghl_contact_id, marketer_id,
      assigned_broker_id, assigned_order_id, assigned_at,
      created_at, updated_at,
      brokers!leads_assigned_broker_id_fkey ( first_name, last_name )
    `)
    .order('created_at', { ascending: false })

  if (brokerIds?.length) {
    query = query.in('assigned_broker_id', brokerIds)
  }

  const { data: leads, error } = await query.limit(50000)

  if (error || !leads) {
    throw new Error('Failed to fetch leads for export')
  }

  const headers = [
    'ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Business Name',
    'State',
    'Vertical',
    'Credit Score',
    'Funding Amount',
    'Funding Purpose',
    'Status',
    'Rejection Reason',
    'AI Call Status',
    'AI Call Notes',
    'GHL Contact ID',
    'Marketer ID',
    'Assigned Broker ID',
    'Broker Name',
    'Assigned Order ID',
    'Assigned At',
    'Created At',
    'Updated At',
  ]

  const rows = leads.map((lead) => {
    const broker = lead.brokers as { first_name: string; last_name: string } | null
    const brokerName = broker ? `${broker.first_name} ${broker.last_name}`.trim() : ''

    return [
      field(lead.id),
      field(lead.first_name),
      field(lead.last_name),
      field(lead.email),
      field(lead.phone),
      field(lead.business_name),
      field(lead.state),
      field(lead.vertical),
      field(lead.credit_score),
      field(lead.funding_amount),
      field(lead.funding_purpose),
      field(lead.status),
      field(lead.rejection_reason),
      field(lead.ai_call_status),
      field(lead.ai_call_notes),
      field(lead.ghl_contact_id),
      field(lead.marketer_id),
      field(lead.assigned_broker_id),
      field(brokerName),
      field(lead.assigned_order_id),
      field(lead.assigned_at),
      field(lead.created_at),
      field(lead.updated_at),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
