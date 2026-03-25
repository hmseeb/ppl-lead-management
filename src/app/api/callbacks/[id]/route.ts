import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fireCallbackWebhook } from '@/lib/webhooks/callback-webhook'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  // Fetch callback
  const { data: callback, error: fetchError } = await supabase
    .from('callbacks')
    .select('id, lead_id, broker_id, scheduled_time, status, notes, created_at')
    .eq('id', id)
    .single()

  if (fetchError || !callback) {
    return NextResponse.json(
      { error: 'callback_not_found', message: 'No callback found with this ID' },
      { status: 404 }
    )
  }

  if (callback.status === 'cancelled' || callback.status === 'completed') {
    return NextResponse.json(
      { error: `callback_already_${callback.status}`, message: `Callback is already ${callback.status}` },
      { status: 409 }
    )
  }

  // Cancel the callback
  const { data: updated, error: updateError } = await supabase
    .from('callbacks')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, lead_id, broker_id, scheduled_time, status, notes, created_at, updated_at')
    .single()

  if (updateError || !updated) {
    return NextResponse.json(
      { error: 'update_failed', message: updateError?.message ?? 'Failed to cancel callback' },
      { status: 500 }
    )
  }

  // Fetch lead and broker for webhook payload
  const { data: lead } = await supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, vertical, credit_score, funding_amount, state')
    .eq('id', callback.lead_id)
    .single()

  const { data: broker } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, email, phone, company_name, crm_webhook_url')
    .eq('id', callback.broker_id)
    .single()

  // Fire webhook (fire-and-forget)
  if (lead && broker) {
    fireCallbackWebhook({
      type: 'callback_cancelled',
      callback: {
        id: updated.id,
        scheduled_time: updated.scheduled_time,
        status: updated.status,
        notes: updated.notes,
        created_at: updated.created_at,
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
  }

  // Log activity
  await supabase.from('activity_log').insert({
    event_type: 'callback_cancelled',
    lead_id: callback.lead_id,
    broker_id: callback.broker_id,
    details: { callback_id: callback.id },
  })

  return NextResponse.json(updated, { status: 200 })
}
