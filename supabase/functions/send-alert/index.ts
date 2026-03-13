const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

interface AlertPayload {
  type: 'delivery_failed' | 'unassigned_lead' | string
  admin_contact_id: string
  lead_name?: string
  broker_name?: string
  channel?: string
  error?: string
  reason?: string
  [key: string]: unknown
}

function formatDeliveryFailed(data: AlertPayload): string {
  const parts = [
    'ALERT: Delivery failed permanently',
    `Lead: ${data.lead_name ?? 'Unknown'}`,
    `Broker: ${data.broker_name ?? 'Unknown'}`,
    `Channel: ${data.channel ?? 'Unknown'}`,
    `Error: ${data.error ?? 'No details'}`,
  ]
  return parts.join('\n')
}

function formatUnassignedLead(data: AlertPayload): string {
  const parts = [
    'ALERT: Lead unassigned',
    `Lead: ${data.lead_name ?? 'Unknown'}`,
    `Reason: ${data.reason ?? 'No matching order'}`,
  ]
  return parts.join('\n')
}

function formatGenericAlert(data: AlertPayload): string {
  const { type, admin_contact_id: _, ...rest } = data
  return `ALERT: ${type}\n${JSON.stringify(rest)}`
}

function formatMessage(data: AlertPayload): string {
  switch (data.type) {
    case 'delivery_failed':
      return formatDeliveryFailed(data)
    case 'unassigned_lead':
      return formatUnassignedLead(data)
    default:
      return formatGenericAlert(data)
  }
}

Deno.serve(async (req) => {
  // Verify service role auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  let body: AlertPayload
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 })
  }

  const { type, admin_contact_id } = body

  if (!type || !admin_contact_id) {
    return new Response(
      JSON.stringify({ error: 'missing_fields', detail: 'type and admin_contact_id are required' }),
      { status: 400 },
    )
  }

  const ghlToken = Deno.env.get('GHL_API_TOKEN')
  if (!ghlToken) {
    return new Response(
      JSON.stringify({ error: 'GHL_API_TOKEN not configured' }),
      { status: 500 },
    )
  }

  const message = formatMessage(body)

  let ghlResponse: Response
  let ghlBody: Record<string, unknown> = {}

  try {
    ghlResponse = await fetch(`${GHL_BASE_URL}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ghlToken}`,
        'Version': GHL_API_VERSION,
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId: admin_contact_id,
        message,
      }),
    })

    ghlBody = await ghlResponse.json().catch(() => ({}))
  } catch (err) {
    console.error('send-alert: GHL network error', err)
    return new Response(
      JSON.stringify({ error: 'ghl_network_error' }),
      { status: 502 },
    )
  }

  if (ghlResponse.ok) {
    const messageId = (ghlBody as Record<string, string>).messageId
      ?? (ghlBody as Record<string, string>).id
    return new Response(JSON.stringify({ success: true, messageId }), { status: 200 })
  }

  // Rate limited: return 429, do NOT mark as permanent failure
  if (ghlResponse.status === 429) {
    console.error('send-alert: GHL rate limited (429)', ghlBody)
    return new Response(
      JSON.stringify({ error: 'ghl_429' }),
      { status: 429 },
    )
  }

  // Other GHL errors
  const detail = JSON.stringify(ghlBody)
  console.error(`send-alert: GHL error ${ghlResponse.status}`, detail)
  return new Response(
    JSON.stringify({ error: `ghl_${ghlResponse.status}`, detail }),
    { status: 502 },
  )
})
