import { createAdminClient } from '@/lib/supabase/admin'

interface DeliverResult {
  success: boolean
  error?: string
}

export async function deliverWebhook(deliveryId: string): Promise<DeliverResult> {
  try {
    const supabase = createAdminClient()

    // Fetch the delivery record
    const { data: record, error: fetchError } = await supabase
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single()

    if (fetchError || !record) {
      return { success: false, error: 'delivery_not_found' }
    }

    // Only attempt delivery for pending or failed records
    if (record.status !== 'pending' && record.status !== 'failed') {
      return { success: true } // already sent or permanently failed, skip
    }

    // Send HTTP POST to target URL
    if (!record.target_url) {
      return { success: false, error: 'no_target_url' }
    }

    let response: Response
    try {
      response = await fetch(record.target_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record.payload),
        signal: AbortSignal.timeout(10_000),
      })
    } catch (err) {
      // Network error or timeout
      const errorMessage = err instanceof Error ? err.message : 'network_error'
      await supabase
        .from('deliveries')
        .update({
          status: 'failed',
          error_message: errorMessage,
          retry_count: record.retry_count + 1,
          last_retry_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)

      console.error(`[webhook] delivery ${deliveryId} failed:`, errorMessage)
      return { success: false, error: errorMessage }
    }

    if (response.ok) {
      // 2xx success
      await supabase
        .from('deliveries')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', deliveryId)

      return { success: true }
    }

    // Non-2xx response
    const errorMessage = `HTTP ${response.status}: ${response.statusText}`
    await supabase
      .from('deliveries')
      .update({
        status: 'failed',
        error_message: errorMessage,
        retry_count: record.retry_count + 1,
        last_retry_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)

    console.error(`[webhook] delivery ${deliveryId} failed:`, errorMessage)
    return { success: false, error: errorMessage }
  } catch (err) {
    // Catch-all: never throw
    const errorMessage = err instanceof Error ? err.message : 'unknown_error'
    console.error(`[webhook] delivery ${deliveryId} unexpected error:`, errorMessage)
    return { success: false, error: errorMessage }
  }
}
