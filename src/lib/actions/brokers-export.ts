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
  if (Array.isArray(value)) return escapeCsvField(value.join('; '))
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return escapeCsvField(String(value))
}

export async function exportAllBrokersCsv() {
  const role = await getRole()
  const brokerIds = role === 'marketer' ? await getMarketerBrokerIds() : undefined

  const supabase = createAdminClient()

  let query = supabase
    .from('brokers')
    .select(`
      id, ghl_contact_id, first_name, last_name, email, phone,
      company, company_name, state,
      primary_vertical, secondary_vertical,
      batch_size, deal_amount,
      delivery_methods, crm_webhook_url,
      timezone, contact_hours, custom_hours_start, custom_hours_end, weekend_pause,
      assignment_status, status,
      created_at,
      orders ( status, leads_delivered, last_assigned_at )
    `)
    .order('created_at', { ascending: false })

  if (brokerIds?.length) {
    query = query.in('id', brokerIds)
  }

  const { data: brokers, error } = await query.limit(50000)

  if (error || !brokers) {
    throw new Error('Failed to fetch brokers for export')
  }

  const headers = [
    'ID',
    'GHL Contact ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'State',
    'Primary Vertical',
    'Secondary Vertical',
    'Batch Size',
    'Deal Amount',
    'Delivery Methods',
    'CRM Webhook URL',
    'Timezone',
    'Contact Hours',
    'Custom Hours Start',
    'Custom Hours End',
    'Weekend Pause',
    'Assignment Status',
    'Onboarding Status',
    'Active Orders',
    'Total Leads Delivered',
    'Last Delivery Date',
    'Created At',
  ]

  const rows = brokers.map((broker) => {
    const orders = (broker.orders ?? []) as { status: string; leads_delivered: number; last_assigned_at: string | null }[]
    const activeOrdersCount = orders.filter((o) => o.status === 'active').length
    const totalLeadsDelivered = orders.reduce((sum, o) => sum + (o.leads_delivered ?? 0), 0)
    const lastDeliveryDate = orders.reduce<string | null>((latest, o) => {
      if (!o.last_assigned_at) return latest
      if (!latest) return o.last_assigned_at
      return o.last_assigned_at > latest ? o.last_assigned_at : latest
    }, null)

    return [
      field(broker.id),
      field(broker.ghl_contact_id),
      field(broker.first_name),
      field(broker.last_name),
      field(broker.email),
      field(broker.phone),
      field(broker.company || broker.company_name),
      field(broker.state),
      field(broker.primary_vertical),
      field(broker.secondary_vertical),
      field(broker.batch_size),
      field(broker.deal_amount),
      field(broker.delivery_methods),
      field(broker.crm_webhook_url),
      field(broker.timezone),
      field(broker.contact_hours),
      field(broker.custom_hours_start),
      field(broker.custom_hours_end),
      field(broker.weekend_pause),
      field(broker.assignment_status),
      field(broker.status),
      field(activeOrdersCount),
      field(totalLeadsDelivered),
      field(lastDeliveryDate),
      field(broker.created_at),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
