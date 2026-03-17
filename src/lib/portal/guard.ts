import { redirect } from 'next/navigation'
import { getBrokerSession } from '@/lib/auth/broker-session'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Portal mutation guards.
 *
 * requireBrokerSession() validates the session exists and returns brokerId.
 * assert* functions verify the authenticated broker owns the target resource
 * before allowing any mutation.
 */

export class BrokerAccessDeniedError extends Error {
  constructor(resource: string, resourceId: string) {
    super(`Access denied: broker does not own ${resource} ${resourceId}`)
    this.name = 'BrokerAccessDeniedError'
  }
}

/**
 * Validates broker session exists and returns the brokerId.
 * Redirects to login if not authenticated.
 */
export async function requireBrokerSession(): Promise<{ brokerId: string }> {
  const session = await getBrokerSession()

  if (!session.isBroker || !session.brokerId) {
    redirect('/portal/login')
  }

  return { brokerId: session.brokerId }
}

/**
 * Verifies the given order belongs to the authenticated broker.
 * Throws BrokerAccessDeniedError if not.
 */
export async function assertBrokerOwnsOrder(
  brokerId: string,
  orderId: string
): Promise<void> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('broker_id', brokerId)
    .single()

  if (!data) {
    throw new BrokerAccessDeniedError('order', orderId)
  }
}

/**
 * Verifies the given lead is assigned to the authenticated broker.
 * Throws BrokerAccessDeniedError if not.
 */
export async function assertBrokerOwnsLead(
  brokerId: string,
  leadId: string
): Promise<void> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('assigned_broker_id', brokerId)
    .single()

  if (!data) {
    throw new BrokerAccessDeniedError('lead', leadId)
  }
}
