import { createAdminClient } from '@/lib/supabase/admin'
import { deliverWebhook } from '@/lib/webhooks/deliver'
import { sendEmail, sendSms } from '@/lib/ghl/client'

interface DispatchResult {
  method: string
  success: boolean
  deliveryId?: string
  error?: string
}

/**
 * Dispatches lead delivery to all channels the broker selected during onboarding.
 *
 * The assign_lead() SQL function already creates delivery rows in the `deliveries` table
 * for each channel. For crm_webhook, the pg trigger fires it via pg_net automatically.
 * For email/sms, the pg trigger calls the deliver-ghl edge function.
 *
 * This dispatcher is the app-level fallback: it reads pending deliveries and fires them
 * directly if the triggers haven't handled them yet (e.g. vault secrets not configured).
 */
export async function dispatchDelivery(
  leadId: string,
  brokerId: string,
  _orderId?: string,
): Promise<DispatchResult[]> {
  const supabase = createAdminClient()
  const results: DispatchResult[] = []

  // Fetch pending deliveries for this lead (created by assign_lead)
  const { data: deliveries } = await (supabase
    .from('deliveries') as any)
    .select('id, channel, target_url, ghl_contact_id, payload, status')
    .eq('lead_id', leadId)
    .eq('broker_id', brokerId)
    .in('status', ['pending']) as { data: any[] | null }

  if (!deliveries || deliveries.length === 0) {
    return [{ method: 'all', success: true, error: 'no_pending_deliveries' }]
  }

  const promises: Promise<void>[] = []

  for (const delivery of deliveries) {
    if (delivery.channel === 'crm_webhook' && delivery.target_url) {
      // Webhook: use existing deliver function
      promises.push(
        deliverWebhook(delivery.id).then((r) => {
          results.push({
            method: 'crm_webhook',
            success: r.success,
            deliveryId: delivery.id,
            error: r.error,
          })
        })
      )
    } else if (delivery.channel === 'email' && delivery.ghl_contact_id) {
      const fromEmail = process.env.GHL_FROM_EMAIL ?? 'leads@pplleads.com'
      promises.push(
        sendEmail(delivery.ghl_contact_id, delivery.payload as any, fromEmail).then(async (r) => {
          await (supabase
            .from('deliveries') as any)
            .update({
              status: r.success ? 'sent' : 'failed',
              sent_at: r.success ? new Date().toISOString() : undefined,
              ghl_message_id: r.messageId ?? undefined,
              error_message: r.error ?? null,
            })
            .eq('id', delivery.id)

          results.push({
            method: 'email',
            success: r.success,
            deliveryId: delivery.id,
            error: r.error,
          })
        })
      )
    } else if (delivery.channel === 'sms' && delivery.ghl_contact_id) {
      promises.push(
        sendSms(delivery.ghl_contact_id, delivery.payload as any).then(async (r) => {
          await (supabase
            .from('deliveries') as any)
            .update({
              status: r.success ? 'sent' : 'failed',
              sent_at: r.success ? new Date().toISOString() : undefined,
              ghl_message_id: r.messageId ?? undefined,
              error_message: r.error ?? null,
            })
            .eq('id', delivery.id)

          results.push({
            method: 'sms',
            success: r.success,
            deliveryId: delivery.id,
            error: r.error,
          })
        })
      )
    }
  }

  await Promise.allSettled(promises)
  return results
}
