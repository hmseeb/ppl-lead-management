const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

function getApiToken(): string {
  const token = process.env.GHL_API_TOKEN
  if (!token) throw new Error('GHL_API_TOKEN environment variable is not set')
  return token
}

interface GhlMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

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

export async function sendEmail(
  contactId: string,
  lead: LeadPayload,
  fromEmail: string
): Promise<GhlMessageResult> {
  try {
    const response = await fetch(`${GHL_BASE_URL}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiToken()}`,
        'Version': GHL_API_VERSION,
      },
      body: JSON.stringify({
        type: 'Email',
        contactId,
        subject: `New Lead Assigned: ${[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'}`,
        html: buildEmailHtml(lead),
        emailFrom: fromEmail,
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { success: false, error: `HTTP ${response.status}: ${body}` }
    }

    const data = await response.json().catch(() => ({}))
    return { success: true, messageId: data.messageId ?? data.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'unknown_error' }
  }
}

export async function sendSms(
  contactId: string,
  lead: LeadPayload
): Promise<GhlMessageResult> {
  try {
    const response = await fetch(`${GHL_BASE_URL}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiToken()}`,
        'Version': GHL_API_VERSION,
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId,
        message: buildSmsBody(lead),
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { success: false, error: `HTTP ${response.status}: ${body}` }
    }

    const data = await response.json().catch(() => ({}))
    return { success: true, messageId: data.messageId ?? data.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'unknown_error' }
  }
}
