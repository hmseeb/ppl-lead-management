import { createAdminClient } from '@/lib/supabase/admin'
import { deliverWebhook } from '@/lib/webhooks/deliver'
import { sendEmail, sendSms } from '@/lib/ghl/client'

interface DispatchResult {
  method: string
  success: boolean
  error?: string
}

/**
 * Dispatches lead delivery to all channels the broker selected during onboarding.
 * Runs each method independently. one failure doesn't block the others.
 */
export async function dispatchDelivery(
  leadId: string,
  brokerId: string,
  orderId: string,
  deliveryId: string | null
): Promise<DispatchResult[]> {
  const supabase = createAdminClient()
  const results: DispatchResult[] = []

  // Fetch broker delivery preferences
  const { data: broker } = await supabase
    .from('brokers')
    .select('delivery_methods, delivery_email, delivery_phone, crm_webhook_url, ghl_contact_id')
    .eq('id', brokerId)
    .single()

  if (!broker) {
    return [{ method: 'all', success: false, error: 'broker_not_found' }]
  }

  const methods = broker.delivery_methods ?? []

  // Fetch lead payload for GHL messages
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) {
    return [{ method: 'all', success: false, error: 'lead_not_found' }]
  }

  const leadPayload = {
    lead_id: lead.id,
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    business_name: lead.business_name,
    vertical: lead.vertical,
    credit_score: lead.credit_score,
    funding_amount: lead.funding_amount,
    funding_purpose: lead.funding_purpose,
    state: lead.state,
    ai_call_notes: lead.ai_call_notes,
    ai_call_status: lead.ai_call_status,
    ghl_contact_id: lead.ghl_contact_id,
    assigned_at: lead.assigned_at,
    order_id: orderId,
    broker_id: brokerId,
  }

  // Dispatch to each selected method in parallel
  const promises: Promise<void>[] = []

  if (methods.includes('crm_webhook') && deliveryId) {
    promises.push(
      deliverWebhook(deliveryId).then((r) => {
        results.push({ method: 'crm_webhook', success: r.success, error: r.error })
      })
    )
  }

  if (methods.includes('email') && broker.ghl_contact_id) {
    const fromEmail = process.env.GHL_FROM_EMAIL ?? 'leads@pplleads.com'
    promises.push(
      sendEmail(broker.ghl_contact_id, leadPayload, fromEmail).then((r) => {
        results.push({ method: 'email', success: r.success, error: r.error })
      })
    )
  }

  if (methods.includes('sms') && broker.ghl_contact_id) {
    promises.push(
      sendSms(broker.ghl_contact_id, leadPayload).then((r) => {
        results.push({ method: 'sms', success: r.success, error: r.error })
      })
    )
  }

  // If no methods matched, fall back to webhook if delivery exists
  if (promises.length === 0 && deliveryId) {
    const r = await deliverWebhook(deliveryId)
    results.push({ method: 'webhook_fallback', success: r.success, error: r.error })
  }

  await Promise.allSettled(promises)
  return results
}
