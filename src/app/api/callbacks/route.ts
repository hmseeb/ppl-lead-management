import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { fireCallbackWebhook } from '@/lib/webhooks/callback-webhook'

/* ------------------------------------------------------------------ */
/*  GET /api/callbacks – list with filters & pagination                */
/* ------------------------------------------------------------------ */

const listCallbacksSchema = z.object({
  lead_id: z.string().uuid().optional(),
  broker_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Build a plain object from search params (only include keys that are present)
  const raw: Record<string, string> = {}
  for (const key of ['lead_id', 'broker_id', 'status', 'from', 'to', 'limit', 'offset']) {
    const val = searchParams.get(key)
    if (val !== null) raw[key] = val
  }

  const result = listCallbacksSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json(
      { error: 'validation_error', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { lead_id, broker_id, status, from, to, limit, offset } = result.data
  const supabase = createAdminClient()

  let query = supabase
    .from('callbacks')
    .select(
      'id, lead_id, broker_id, scheduled_time, status, notes, created_at, updated_at, leads!inner(first_name, last_name, phone, vertical, credit_score), brokers!inner(first_name, last_name, company_name)',
      { count: 'exact' }
    )

  if (lead_id) query = query.eq('lead_id', lead_id)
  if (broker_id) query = query.eq('broker_id', broker_id)
  if (status) query = query.eq('status', status)
  if (from) query = query.gte('scheduled_time', from)
  if (to) query = query.lte('scheduled_time', to)

  query = query.order('scheduled_time', { ascending: false })
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { error: 'db_error', message: error.message },
      { status: 500 }
    )
  }

  const callbacks = (data ?? []).map((row: Record<string, unknown>) => {
    const leads = row.leads as { first_name: string | null; last_name: string | null; phone: string | null; vertical: string | null; credit_score: number | null } | null
    const brokers = row.brokers as { first_name: string | null; last_name: string | null; company_name: string | null } | null
    return {
      id: row.id,
      lead_id: row.lead_id,
      broker_id: row.broker_id,
      scheduled_time: row.scheduled_time,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      lead_name: leads
        ? [leads.first_name, leads.last_name].filter(Boolean).join(' ') || null
        : null,
      lead_phone: leads?.phone ?? null,
      lead_vertical: leads?.vertical ?? null,
      lead_credit_score: leads?.credit_score ?? null,
      broker_name: brokers
        ? [brokers.first_name, brokers.last_name].filter(Boolean).join(' ') || null
        : null,
      broker_company: brokers?.company_name ?? null,
    }
  })

  return NextResponse.json({ data: callbacks, total: count, limit, offset })
}

/* ------------------------------------------------------------------ */
/*  POST /api/callbacks – book a new callback                          */
/* ------------------------------------------------------------------ */

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
