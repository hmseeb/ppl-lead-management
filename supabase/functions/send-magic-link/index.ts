const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

interface MagicLinkPayload {
  to: string
  name: string
  link: string
  ghl_contact_id: string
}

function buildMagicLinkHtml(name: string, link: string): string {
  return `<html>
<body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:0;background-color:#f9fafb;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#dc2626;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">PPL Portal</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;font-size:16px;">Hi ${name},</p>
      <p style="margin:0 0 24px;font-size:14px;color:#555;">Click the button below to log in to your broker portal. This link expires in 15 minutes.</p>
      <a href="${link}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Log In to Portal</a>
      <p style="margin:24px 0 0;font-size:12px;color:#999;">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="margin:4px 0 0;font-size:12px;color:#999;word-break:break-all;">${link}</p>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#999;">PPL Lead Management</p>
    </div>
  </div>
</body>
</html>`
}

Deno.serve(async (req) => {
  // Verify service role auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  let body: MagicLinkPayload
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 })
  }

  const { name, link, ghl_contact_id } = body

  if (!ghl_contact_id || !link || !name) {
    return new Response(
      JSON.stringify({ error: 'missing_fields', detail: 'ghl_contact_id, name, and link are required' }),
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

  const fromEmail = Deno.env.get('GHL_FROM_EMAIL') ?? 'leads@pplleads.com'
  const html = buildMagicLinkHtml(name, link)

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
        type: 'Email',
        contactId: ghl_contact_id,
        subject: 'Your Portal Login Link',
        html,
        emailFrom: fromEmail,
      }),
    })

    ghlBody = await ghlResponse.json().catch(() => ({}))
  } catch (err) {
    console.error('send-magic-link: GHL network error', err)
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

  if (ghlResponse.status === 429) {
    console.error('send-magic-link: GHL rate limited (429)', ghlBody)
    return new Response(
      JSON.stringify({ error: 'ghl_429' }),
      { status: 429 },
    )
  }

  const detail = JSON.stringify(ghlBody)
  console.error(`send-magic-link: GHL error ${ghlResponse.status}`, detail)
  return new Response(
    JSON.stringify({ error: `ghl_${ghlResponse.status}`, detail }),
    { status: 502 },
  )
})
