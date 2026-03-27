import { NextResponse } from 'next/server'
import { incomingLeadSchema } from '@/lib/webhooks/schemas'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignLead } from '@/lib/assignment/assign'
import { dispatchDelivery } from '@/lib/delivery/dispatcher'
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

  // 2b. Check for marketer Bearer token
  let marketerId: string | null = null
  let scopedBrokerIds: string[] | undefined = undefined

  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    const { data: marketer } = await supabase
      .from('marketers')
      .select('id, status')
      .eq('token', token)
      .single()

    if (!marketer) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
    }
    if (marketer.status !== 'active') {
      return NextResponse.json({ error: 'marketer_inactive' }, { status: 403 })
    }

    marketerId = marketer.id

    const { data: assignments } = await supabase
      .from('marketer_brokers')
      .select('broker_id')
      .eq('marketer_id', marketer.id)

    scopedBrokerIds = (assignments ?? []).map(a => a.broker_id)

    if (scopedBrokerIds.length === 0) {
      return NextResponse.json(
        { error: 'no_brokers_assigned', message: 'Marketer has no brokers assigned' },
        { status: 400 }
      )
    }
  }

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

  // 3a. Email + phone dedup (VALID-04)
  if (data.email && data.phone) {
    const { data: emailPhoneDup } = await supabase
      .from('leads')
      .select('id')
      .ilike('email', data.email)
      .eq('phone', data.phone)
      .maybeSingle()

    if (emailPhoneDup) {
      return NextResponse.json(
        { lead_id: emailPhoneDup.id, status: 'duplicate', message: 'duplicate email+phone combination' },
        { status: 200 }
      )
    }
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
      marketer_id: marketerId,
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

  // 5. Pre-flight validation
  let rejectionReason: string | null = null

  // VALID-02: Missing or invalid loan amount
  if (data.funding_amount === undefined || data.funding_amount === null || data.funding_amount <= 0) {
    rejectionReason = 'invalid_loan_amount'
  }

  // VALID-03: No active orders + VALID-01: Credit floor from lowest order minimum
  if (!rejectionReason) {
    const { data: lowestOrder } = await supabase
      .from('orders')
      .select('credit_score_min')
      .eq('status', 'active')
      .order('credit_score_min', { ascending: true, nullsFirst: true })
      .limit(1)
      .single()

    if (!lowestOrder) {
      rejectionReason = 'no_active_orders'
    } else {
      const floor = lowestOrder.credit_score_min ?? 0
      if (data.credit_score !== undefined && floor > 0 && data.credit_score < floor) {
        rejectionReason = 'credit_too_low'
      }
    }
  }

  // If any pre-flight check failed, reject the lead but add to unassigned queue for manual override
  if (rejectionReason) {
    await supabase
      .from('leads')
      .update({ status: 'rejected', rejection_reason: rejectionReason })
      .eq('id', lead.id)

    await supabase
      .from('unassigned_queue')
      .insert({
        lead_id: lead.id,
        reason: rejectionReason,
        details: `credit: ${data.credit_score ?? 'N/A'}, amount: ${data.funding_amount ?? 'N/A'}`,
      })

    await supabase
      .from('activity_log')
      .insert({
        event_type: 'lead_rejected',
        lead_id: lead.id,
        details: {
          reason: rejectionReason,
          credit_score: data.credit_score ?? null,
          funding_amount: data.funding_amount ?? null,
        },
      })

    return NextResponse.json(
      { lead_id: lead.id, status: 'rejected', reason: rejectionReason },
      { status: 200 }
    )
  }

  // 6. Trigger assignment engine
  let assignment
  try {
    assignment = await assignLead(lead.id, scopedBrokerIds)
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown error'
    console.error(`assignLead failed for ${lead.id}:`, reason)

    // Assignment threw, but the lead exists. Mark it unassigned so it
    // doesn't rot in pending. The unassigned_queue lets ops retry later.
    await supabase
      .from('leads')
      .update({ status: 'unassigned', updated_at: new Date().toISOString() })
      .eq('id', lead.id)

    await supabase
      .from('unassigned_queue')
      .insert({
        lead_id: lead.id,
        reason: 'assignment_error',
        details: reason,
      })

    await supabase
      .from('activity_log')
      .insert({
        event_type: 'lead_unassigned',
        lead_id: lead.id,
        details: { reason: 'assignment_error', error: reason },
      })

    assignment = {
      status: 'unassigned' as const,
      reason,
    }
  }

  // 6. Fire-and-forget multi-channel delivery if assigned
  // assign_lead() creates delivery rows + triggers fire them automatically.
  // dispatchDelivery() is a fallback that picks up any still-pending rows.
  if (assignment.status === 'assigned' && assignment.broker_id) {
    dispatchDelivery(
      lead.id,
      assignment.broker_id,
      assignment.order_id!,
    ).catch(console.error)
  }

  // 7. Return fast
  return NextResponse.json({ lead_id: lead.id, assignment }, { status: 200 })
}
