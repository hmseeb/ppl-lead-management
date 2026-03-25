import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { fireCallbackWebhook } from '@/lib/webhooks/callback-webhook'

const bookCallbackSchema = z.object({
  lead_id: z.string().uuid(),
  broker_id: z.string().uuid(),
  scheduled_time: z.string().datetime(),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.scheduled_time) > new Date(),
  { message: 'scheduled_time must be in the future', path: ['scheduled_time'] }
)

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const result = bookCallbackSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'validation_error', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { lead_id, broker_id, scheduled_time, notes } = result.data
  const supabase = createAdminClient()

  // Verify lead exists
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, vertical, credit_score, funding_amount, state')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json(
      { error: 'lead_not_found', message: 'No lead found with this ID' },
      { status: 404 }
    )
  }

  // Verify broker exists
  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, email, phone, company_name, crm_webhook_url')
    .eq('id', broker_id)
    .single()

  if (brokerError || !broker) {
    return NextResponse.json(
      { error: 'broker_not_found', message: 'No broker found with this ID' },
      { status: 404 }
    )
  }

  // Insert callback
  const { data: callback, error: insertError } = await supabase
    .from('callbacks')
    .insert({
      lead_id,
      broker_id,
      scheduled_time,
      notes: notes ?? null,
      status: 'pending',
    })
    .select('id, lead_id, broker_id, scheduled_time, status, notes, created_at, updated_at')
    .single()

  if (insertError || !callback) {
    return NextResponse.json(
      { error: 'insert_failed', message: insertError?.message ?? 'Failed to create callback' },
      { status: 500 }
    )
  }

  // Fire webhook (fire-and-forget)
  fireCallbackWebhook({
    type: 'callback_created',
    callback: {
      id: callback.id,
      scheduled_time: callback.scheduled_time,
      status: callback.status,
      notes: callback.notes,
      created_at: callback.created_at,
    },
    lead: {
      id: lead.id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      vertical: lead.vertical,
      credit_score: lead.credit_score,
      funding_amount: lead.funding_amount,
      state: lead.state,
    },
    broker: {
      id: broker.id,
      first_name: broker.first_name,
      last_name: broker.last_name,
      email: broker.email,
      phone: broker.phone,
      company_name: broker.company_name,
      crm_webhook_url: broker.crm_webhook_url,
    },
  }).catch(console.error)

  // Log activity
  await supabase.from('activity_log').insert({
    event_type: 'callback_created',
    lead_id,
    broker_id,
    details: { callback_id: callback.id, scheduled_time },
  })

  return NextResponse.json(callback, { status: 201 })
}
