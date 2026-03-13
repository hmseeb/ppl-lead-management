import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliverWebhook } from '@/lib/webhooks/deliver'
import { sendEmail, sendSms } from '@/lib/ghl/client'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: record, error: fetchError } = await supabase
    .from('deliveries' as any)
    .select('id, status, channel, target_url, ghl_contact_id, payload')
    .eq('id', id)
    .single() as any

  if (fetchError || !record) {
    return NextResponse.json({ error: 'delivery_not_found' }, { status: 404 })
  }

  if (record.status !== 'failed' && record.status !== 'failed_permanent') {
    return NextResponse.json(
      { error: 'delivery_not_retryable', status: record.status },
      { status: 400 }
    )
  }

  // Reset for permanent failures
  if (record.status === 'failed_permanent') {
    await (supabase.from('deliveries' as any) as any)
      .update({ retry_count: 0, status: 'failed' })
      .eq('id', id)
  }

  let result: { success: boolean; error?: string; messageId?: string }

  if (record.channel === 'crm_webhook') {
    result = await deliverWebhook(id)
  } else if (record.channel === 'email' && record.ghl_contact_id) {
    const fromEmail = process.env.GHL_FROM_EMAIL ?? 'leads@pplleads.com'
    result = await sendEmail(record.ghl_contact_id, record.payload, fromEmail)

    await (supabase.from('deliveries' as any) as any)
      .update({
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? new Date().toISOString() : undefined,
        ghl_message_id: result.messageId ?? undefined,
        error_message: result.error ?? null,
        retry_count: record.status === 'failed_permanent' ? 1 : undefined,
      })
      .eq('id', id)
  } else if (record.channel === 'sms' && record.ghl_contact_id) {
    result = await sendSms(record.ghl_contact_id, record.payload)

    await (supabase.from('deliveries' as any) as any)
      .update({
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? new Date().toISOString() : undefined,
        ghl_message_id: result.messageId ?? undefined,
        error_message: result.error ?? null,
        retry_count: record.status === 'failed_permanent' ? 1 : undefined,
      })
      .eq('id', id)
  } else {
    return NextResponse.json({ error: 'unknown_channel', channel: record.channel }, { status: 400 })
  }

  if (result.success) {
    return NextResponse.json({ delivery_id: id, channel: record.channel, result }, { status: 200 })
  }

  return NextResponse.json(
    { error: 'retry_failed', channel: record.channel, message: result.error },
    { status: 500 }
  )
}
