import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliverWebhook } from '@/lib/webhooks/deliver'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Validate UUID format
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch delivery record
  const { data: record, error: fetchError } = await supabase
    .from('webhook_deliveries')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError || !record) {
    return NextResponse.json({ error: 'delivery_not_found' }, { status: 404 })
  }

  // Only retry failed or permanently failed deliveries
  if (record.status !== 'failed' && record.status !== 'failed_permanent') {
    return NextResponse.json(
      { error: 'delivery_not_retryable', status: record.status },
      { status: 400 }
    )
  }

  // Reset retry_count for permanent failures (manual override)
  if (record.status === 'failed_permanent') {
    await supabase
      .from('webhook_deliveries')
      .update({ retry_count: 0, status: 'failed' })
      .eq('id', id)
  }

  // Await the delivery result (unlike fire-and-forget in ingestion)
  const result = await deliverWebhook(id)

  if (result.success) {
    return NextResponse.json({ delivery_id: id, result }, { status: 200 })
  }

  return NextResponse.json(
    { error: 'retry_failed', message: result.error },
    { status: 500 }
  )
}
