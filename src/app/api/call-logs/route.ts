import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const createCallLogSchema = z.object({
  lead_id: z.string().uuid(),
  broker_id: z.string().uuid(),
  outcome: z.enum(['transferred', 'callback_booked', 'no_answer', 'voicemail']),
  duration: z.number().int().min(0).default(0),
  retell_call_id: z.string().min(1),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const result = createCallLogSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'validation_error', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { lead_id, broker_id, outcome, duration, retell_call_id, notes } = result.data
  const supabase = createAdminClient()

  // Verify lead exists
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id')
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
    .select('id')
    .eq('id', broker_id)
    .single()

  if (brokerError || !broker) {
    return NextResponse.json(
      { error: 'broker_not_found', message: 'No broker found with this ID' },
      { status: 404 }
    )
  }

  // Insert call log
  const { data: callLog, error: insertError } = await supabase
    .from('call_logs')
    .insert({
      lead_id,
      broker_id,
      outcome,
      duration,
      retell_call_id,
      notes: notes ?? null,
    })
    .select('id, lead_id, broker_id, outcome, duration, retell_call_id, notes, created_at')
    .single()

  if (insertError || !callLog) {
    return NextResponse.json(
      { error: 'insert_failed', message: insertError?.message ?? 'Failed to create call log' },
      { status: 500 }
    )
  }

  // Log activity
  await supabase.from('activity_log').insert({
    event_type: 'call_logged',
    lead_id,
    broker_id,
    details: { call_log_id: callLog.id, outcome, retell_call_id },
  })

  return NextResponse.json(callLog, { status: 201 })
}
