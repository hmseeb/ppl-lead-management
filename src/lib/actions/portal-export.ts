'use server'

import { requireBrokerSession } from '@/lib/portal/guard'
import { fetchBrokerLeadsPaginated } from '@/lib/portal/queries'

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function exportLeadsCsv(filters?: {
  search?: string
  vertical?: string
  deliveryStatus?: string
}) {
  const { brokerId } = await requireBrokerSession()

  const { leads } = await fetchBrokerLeadsPaginated(brokerId, 1, 10000, filters)

  const headers = 'Name,Vertical,Credit Score,Funding Amount,Delivery Status,Assigned Date'

  const rows = leads.map((lead) => {
    const name = escapeCsvField(
      `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim()
    )
    const vertical = escapeCsvField(lead.vertical ?? '')
    const creditScore = lead.credit_score != null ? String(lead.credit_score) : ''
    const fundingAmount = lead.funding_amount != null ? String(lead.funding_amount) : ''
    const deliveryStatus = escapeCsvField(lead.delivery_status ?? '')
    const assignedDate = lead.assigned_at
      ? new Date(lead.assigned_at).toISOString().slice(0, 10)
      : ''

    return `${name},${vertical},${creditScore},${fundingAmount},${deliveryStatus},${assignedDate}`
  })

  return [headers, ...rows].join('\n')
}
