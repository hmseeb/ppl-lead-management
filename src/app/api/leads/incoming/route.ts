import { NextResponse } from 'next/server'
import { incomingLeadSchema } from '@/lib/webhooks/schemas'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignLead } from '@/lib/assignment/assign'
import { deliverWebhook } from '@/lib/webhooks/deliver'
import type { Json } from '@/lib/types/database'

export async function POST(request: Request) {
  // 1. Parse JSON body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // 2. Validate with Zod
  const result = incomingLeadSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'invalid_payload', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const data = result.data
  const supabase = createAdminClient()

  // 3. Idempotency check: SELECT first by ghl_contact_id
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('ghl_contact_id', data.ghl_contact_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { lead_id: existing.id, status: 'duplicate', message: 'lead already exists' },
      { status: 200 }
    )
  }

  // 4. Insert lead with validated fields + raw payload
  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      email: data.email || null,
      phone: data.phone || null,
      business_name: data.business_name ?? null,
      vertical: data.vertical,
      credit_score: data.credit_score ?? null,
      funding_amount: data.funding_amount ?? null,
      funding_purpose: data.funding_purpose ?? null,
      state: data.state ?? null,
      ai_call_notes: data.ai_call_notes ?? null,
      ai_call_status: data.ai_call_status ?? null,
      ghl_contact_id: data.ghl_contact_id,
      raw_payload: body as Json,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: 'insert_failed', message: insertError.message },
      { status: 500 }
    )
  }

  // 5. Trigger assignment engine
  let assignment
  try {
    assignment = await assignLead(lead.id)
  } catch (err) {
    // Assignment failure should not block the 200 response.
    // Lead is stored. Assignment can be retried.
    assignment = {
      status: 'error' as const,
      reason: err instanceof Error ? err.message : 'unknown error',
    }
  }

  // 6. Fire-and-forget webhook delivery if assigned
  if (assignment.status === 'assigned' && assignment.delivery_id) {
    deliverWebhook(assignment.delivery_id).catch(console.error)
  }

  // 7. Return fast
  return NextResponse.json({ lead_id: lead.id, assignment }, { status: 200 })
}
