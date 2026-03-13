import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

interface LeadPayload {
  lead_id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  business_name?: string | null
  vertical?: string | null
  credit_score?: number | null
  funding_amount?: number | null
  funding_purpose?: string | null
  state?: string | null
  ai_call_notes?: string | null
  ai_call_status?: string | null
  ghl_contact_id?: string | null
  assigned_at?: string | null
  order_id?: string | null
  broker_id?: string | null
}

function buildEmailHtml(lead: LeadPayload): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
  const rows = [
    ['Name', name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Business', lead.business_name],
    ['Vertical', lead.vertical],
    ['Credit Score', lead.credit_score?.toString()],
    ['Funding Amount', lead.funding_amount ? `$${lead.funding_amount.toLocaleString()}` : null],
    ['Funding Purpose', lead.funding_purpose],
    ['State', lead.state],
    ['AI Call Status', lead.ai_call_status],
    ['AI Call Notes', lead.ai_call_notes],
  ]
    .filter(([, val]) => val)
    .map(([label, val]) => `<tr><td style="padding:6px 12px;font-weight:bold;">${label}</td><td style="padding:6px 12px;">${val}</td></tr>`)
    .join('')

  return `<html><body style="font-family:Arial,sans-serif;color:#333;">
<h2 style="color:#1a73e8;">New Lead Assigned</h2>
<table style="border-collapse:collapse;width:100%;max-width:500px;">${rows}</table>
<p style="margin-top:16px;color:#666;font-size:12px;">Delivered by PPL Lead Management</p>
</body></html>`
}

function buildSmsBody(lead: LeadPayload): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
  const parts = [`New Lead: ${name}`]
  if (lead.vertical) parts.push(`Vertical: ${lead.vertical}`)
  if (lead.credit_score) parts.push(`Credit: ${lead.credit_score}`)
  if (lead.funding_amount) parts.push(`Amount: $${lead.funding_amount.toLocaleString()}`)
  if (lead.phone) parts.push(`Phone: ${lead.phone}`)
  if (lead.email) parts.push(`Email: ${lead.email}`)
  return parts.join('\n')
}

Deno.serve(async (req) => {
  // Verify service role auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const body = await req.json()
  const { delivery_id, channel, ghl_contact_id, payload } = body

  if (!delivery_id || !channel || !ghl_contact_id || !payload) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400 })
  }

  const ghlToken = Deno.env.get('GHL_API_TOKEN')
  if (!ghlToken) {
    return new Response(JSON.stringify({ error: 'GHL_API_TOKEN not configured' }), { status: 500 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const fromEmail = Deno.env.get('GHL_FROM_EMAIL') ?? 'leads@pplleads.com'
  const lead = payload as LeadPayload

  let ghlResponse: Response
  let ghlBody: Record<string, unknown> = {}

  try {
    if (channel === 'email') {
      ghlResponse = await fetch(`${GHL_BASE_URL}/conversations/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ghlToken}`,
          'Version': GHL_API_VERSION,
        },
        body: JSON.stringify({
          type: 'Email',
          contactId: ghl_contact_id,
          subject: `New Lead Assigned: ${[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'}`,
          html: buildEmailHtml(lead),
          emailFrom: fromEmail,
        }),
      })
    } else {
      ghlResponse = await fetch(`${GHL_BASE_URL}/conversations/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ghlToken}`,
          'Version': GHL_API_VERSION,
        },
        body: JSON.stringify({
          type: 'SMS',
          contactId: ghl_contact_id,
          message: buildSmsBody(lead),
        }),
      })
    }

    ghlBody = await ghlResponse.json().catch(() => ({}))
  } catch (err) {
    // Network error
    await supabase
      .from('deliveries')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'network_error',
        retry_count: body.is_retry ? undefined : 0,
      })
      .eq('id', delivery_id)

    return new Response(JSON.stringify({ error: 'ghl_network_error' }), { status: 502 })
  }

  if (ghlResponse.ok) {
    const messageId = (ghlBody as Record<string, string>).messageId ?? (ghlBody as Record<string, string>).id
    await supabase
      .from('deliveries')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        ghl_message_id: messageId,
        error_message: null,
      })
      .eq('id', delivery_id)

    return new Response(JSON.stringify({ success: true, messageId }), { status: 200 })
  }

  // GHL returned an error
  const errorMsg = `HTTP ${ghlResponse.status}: ${JSON.stringify(ghlBody)}`
  await supabase
    .from('deliveries')
    .update({
      status: 'failed',
      error_message: errorMsg,
    })
    .eq('id', delivery_id)

  return new Response(JSON.stringify({ error: errorMsg }), { status: 502 })
})
