'use server'

import { requireBrokerSession } from '@/lib/portal/guard'
import { fetchLeadDeliveryAttempts } from '@/lib/portal/queries'

export async function getLeadDeliveries(leadId: string) {
  const { brokerId } = await requireBrokerSession()
  return fetchLeadDeliveryAttempts(brokerId, leadId)
}
