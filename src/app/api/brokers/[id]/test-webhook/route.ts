import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))

    const supabase = createAdminClient()

    const { data: broker, error } = await supabase
      .from('brokers')
      .select('id, crm_webhook_url')
      .eq('id', id)
      .single()

    if (error || !broker) {
      return NextResponse.json(
        { error: 'Broker not found' },
        { status: 404 }
      )
    }

    const targetUrl = body.webhook_url || broker.crm_webhook_url

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'No webhook URL provided' },
        { status: 400 }
      )
    }

    const payload = {
      lead_id: 'test_00000000-0000-0000-0000-000000000000',
      first_name: 'Test',
      last_name: 'Lead',
      email: 'test.lead@example.com',
      phone: '+15551234567',
      business_name: 'Test Business LLC',
      vertical: 'MCA',
      credit_score: 720,
      funding_amount: 50000,
      funding_purpose: 'working capital',
      state: 'FL',
      ai_call_notes: 'This is a test webhook payload for field mapping',
      ai_call_status: 'qualified',
      ghl_contact_id: 'ghl_test_webhook',
      assigned_at: new Date().toISOString(),
      order_id: 'test_00000000-0000-0000-0000-000000000001',
      broker_id: broker.id,
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    let response: Response
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } catch (fetchError: any) {
      clearTimeout(timeout)
      const message =
        fetchError.name === 'AbortError'
          ? 'Request timed out after 10s'
          : fetchError.message || 'Failed to reach webhook URL'
      return NextResponse.json({ error: message }, { status: 502 })
    } finally {
      clearTimeout(timeout)
    }

    let bodySnippet = ''
    try {
      const text = await response.text()
      bodySnippet = text.slice(0, 500)
    } catch {
      bodySnippet = '(could not read response body)'
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      body: bodySnippet,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
