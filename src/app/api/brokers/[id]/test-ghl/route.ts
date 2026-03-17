import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, sendSms } from '@/lib/ghl/client'

const TEST_LEAD = {
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
  ai_call_notes: 'This is a test notification for delivery verification',
  ai_call_status: 'qualified',
  ghl_contact_id: 'ghl_test',
  assigned_at: new Date().toISOString(),
  order_id: 'test_00000000-0000-0000-0000-000000000001',
  broker_id: '',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    const channel = body.channel as string

    if (!channel || !['email', 'sms'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be "email" or "sms"' },
        { status: 400 }
      )
    }

    // Preflight: check GHL_API_TOKEN exists
    if (!process.env.GHL_API_TOKEN) {
      return NextResponse.json(
        { error: 'GHL_API_TOKEN is not configured on the server' },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()

    const { data: broker, error } = await supabase
      .from('brokers')
      .select('id, ghl_contact_id, first_name, last_name')
      .eq('id', id)
      .single()

    if (error || !broker) {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 })
    }

    if (!broker.ghl_contact_id) {
      return NextResponse.json(
        { error: 'Broker has no GHL Contact ID. Add one in the broker edit form.' },
        { status: 400 }
      )
    }

    const payload = { ...TEST_LEAD, broker_id: broker.id }

    if (channel === 'email') {
      const fromEmail = process.env.GHL_FROM_EMAIL ?? 'leads@pplleads.com'
      const result = await sendEmail(broker.ghl_contact_id, payload, fromEmail)

      if (result.success) {
        return NextResponse.json({ success: true, messageId: result.messageId })
      }

      return NextResponse.json(
        { error: result.error, statusCode: result.statusCode },
        { status: result.statusCode === 429 ? 429 : 502 }
      )
    }

    // sms
    const result = await sendSms(broker.ghl_contact_id, payload)

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId })
    }

    return NextResponse.json(
      { error: result.error, statusCode: result.statusCode },
      { status: result.statusCode === 429 ? 429 : 502 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
