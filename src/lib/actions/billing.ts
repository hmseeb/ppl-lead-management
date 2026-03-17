'use server'

import { requireBrokerSession, assertBrokerOwnsOrder } from '@/lib/portal/guard'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Fetch the Stripe receipt URL for a given order.
 * Validates the broker owns the order, then retrieves the receipt
 * from Stripe via checkout session -> payment intent -> latest charge.
 */
export async function getReceiptUrl(orderId: string): Promise<{ url: string | null; error?: string }> {
  const { brokerId } = await requireBrokerSession()
  await assertBrokerOwnsOrder(brokerId, orderId)

  const supabase = createAdminClient()
  const { data: order } = await supabase
    .from('orders')
    .select('stripe_checkout_session_id, stripe_payment_intent_id')
    .eq('id', orderId)
    .single()

  if (!order) {
    return { url: null, error: 'Order not found' }
  }

  // Try payment intent first (faster, one API call)
  const paymentIntentId = order.stripe_payment_intent_id
  if (paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge'],
      })
      const charge = pi.latest_charge
      if (charge && typeof charge !== 'string' && charge.receipt_url) {
        return { url: charge.receipt_url }
      }
    } catch {
      // Fall through to checkout session approach
    }
  }

  // Fallback: retrieve via checkout session
  const sessionId = order.stripe_checkout_session_id
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent.latest_charge'],
      })
      const pi = session.payment_intent
      if (pi && typeof pi !== 'string') {
        const charge = pi.latest_charge
        if (charge && typeof charge !== 'string' && charge.receipt_url) {
          return { url: charge.receipt_url }
        }
      }
    } catch {
      return { url: null, error: 'Could not retrieve receipt from Stripe' }
    }
  }

  return { url: null, error: 'No Stripe payment info for this order' }
}
