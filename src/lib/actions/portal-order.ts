'use server'

import { requireBrokerSession } from '@/lib/portal/guard'
import { portalOrderSchema } from '@/lib/schemas/portal-order'
import { getLeadPrice } from '@/lib/pricing/lookup'
import { stripe } from '@/lib/stripe/client'

/**
 * Look up the per-lead price for a given vertical + credit tier.
 * Returns price in cents or null if not configured.
 * Used by the order form for live price display.
 */
export async function lookupPrice(vertical: string, creditTierMin: number) {
  const { brokerId } = await requireBrokerSession()
  const priceCents = await getLeadPrice(vertical, creditTierMin, brokerId)
  return { priceCents }
}

/**
 * Create a Stripe Checkout session for a new lead order.
 * Validates input, looks up pricing, creates session, then redirects to Stripe.
 * The order is NOT created in the database here. That happens in the webhook
 * only after successful payment.
 */
export async function createCheckoutSession(data: unknown) {
  const { brokerId } = await requireBrokerSession()

  const result = portalOrderSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }

  const { vertical, credit_tier_min, lead_count } = result.data

  // Look up price (checks broker override first, then default)
  const priceCents = await getLeadPrice(vertical, credit_tier_min, brokerId)
  if (!priceCents) {
    return { error: { _form: ['No price configured for this vertical and credit tier. Contact support.'] } }
  }

  const totalCents = priceCents * lead_count

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Create Stripe Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: priceCents,
            product_data: {
              name: `${vertical} Lead`,
              description: `Credit tier ${credit_tier_min}+`,
            },
          },
          quantity: lead_count,
        },
      ],
      metadata: {
        broker_id: brokerId,
        vertical,
        credit_tier_min: String(credit_tier_min),
        lead_count: String(lead_count),
        price_per_lead_cents: String(priceCents),
        total_price_cents: String(totalCents),
      },
      success_url: `${baseUrl}/portal/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/portal/orders/cancel`,
    })

    if (!session.url) {
      return { error: { _form: ['Failed to create checkout session. Try again.'] } }
    }

    return { url: session.url }
  } catch (err) {
    console.error('Stripe checkout session creation failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown Stripe error'
    return { error: { _form: [`Payment error: ${message}`] } }
  }
}
