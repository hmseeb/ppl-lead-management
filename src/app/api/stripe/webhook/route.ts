import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { reassignUnassignedLeads } from '@/lib/assignment/reassign'
import type Stripe from 'stripe'

/**
 * Stripe webhook handler.
 * Handles checkout.session.completed to create the order in the database.
 * The order does NOT exist until payment succeeds.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('Stripe webhook signature verification failed:', message)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Only process paid sessions
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true })
    }

    const meta = session.metadata
    if (!meta?.broker_id || !meta?.vertical || !meta?.credit_tier_min || !meta?.lead_count) {
      console.error('Stripe webhook: missing metadata in session', session.id)
      return NextResponse.json({ error: 'missing_metadata' }, { status: 400 })
    }

    const brokerId = meta.broker_id
    const vertical = meta.vertical
    const creditTierMin = parseInt(meta.credit_tier_min, 10)
    const leadCount = parseInt(meta.lead_count, 10)
    const pricePerLeadCents = parseInt(meta.price_per_lead_cents || '0', 10)
    const totalPriceCents = parseInt(meta.total_price_cents || '0', 10)

    const supabase = createAdminClient()

    // Idempotency: check if order already exists for this session
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_checkout_session_id', session.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ received: true, order_id: existing.id })
    }

    // Create the order
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        broker_id: brokerId,
        total_leads: leadCount,
        leads_remaining: leadCount,
        leads_delivered: 0,
        verticals: [vertical],
        credit_score_min: creditTierMin,
        status: 'active',
        bonus_mode: false,
        priority: 'normal',
        order_type: 'one_time',
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
        price_per_lead_cents: pricePerLeadCents,
        total_price_cents: totalPriceCents,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Stripe webhook: failed to create order', insertError.message)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      event_type: 'order_created',
      broker_id: brokerId,
      order_id: order.id,
      details: {
        source: 'stripe_checkout',
        vertical,
        credit_tier_min: creditTierMin,
        lead_count: leadCount,
        price_per_lead_cents: pricePerLeadCents,
        total_price_cents: totalPriceCents,
        stripe_session_id: session.id,
      },
    })

    // Auto-reassign unassigned leads that may match this new order
    reassignUnassignedLeads().catch((err) => {
      console.error('Auto-reassignment after Stripe order creation failed:', err)
    })

    return NextResponse.json({ received: true, order_id: order.id })
  }

  // Unhandled event types
  return NextResponse.json({ received: true })
}
