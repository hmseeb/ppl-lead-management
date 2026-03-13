import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

interface DigestStats {
  leads: { received: number; assigned: number; unassigned: number }
  total: number
  sent: number
  failed: number
  channels: {
    crm_webhook: { total: number; failed: number }
    email: { total: number; failed: number }
    sms: { total: number; failed: number }
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function buildDigestEmailHtml(stats: DigestStats, dateStr: string): string {
  const redStyle = (val: number) =>
    val > 0 ? 'color:#d32f2f;font-weight:bold;' : ''

  return `<html>
<body style="font-family:Arial,Helvetica,sans-serif;color:#333;margin:0;padding:0;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:24px;background-color:#1a73e8;color:#ffffff;">
        <h1 style="margin:0;font-size:20px;">PPL Lead Management - Daily Digest</h1>
        <p style="margin:4px 0 0;font-size:14px;opacity:0.9;">${dateStr} - Morning Summary</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1a73e8;">Lead Activity</h2>
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background-color:#f8f9fa;">
            <td style="padding:8px 12px;font-weight:bold;">Received</td>
            <td style="padding:8px 12px;text-align:right;">${stats.leads.received}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;">Assigned</td>
            <td style="padding:8px 12px;text-align:right;">${stats.leads.assigned}</td>
          </tr>
          <tr style="background-color:#f8f9fa;">
            <td style="padding:8px 12px;font-weight:bold;${redStyle(stats.leads.unassigned)}">Unassigned</td>
            <td style="padding:8px 12px;text-align:right;${redStyle(stats.leads.unassigned)}">${stats.leads.unassigned}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 20px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1a73e8;">Deliveries</h2>
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background-color:#f8f9fa;">
            <td style="padding:8px 12px;font-weight:bold;">Total</td>
            <td style="padding:8px 12px;text-align:right;">${stats.total}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;">Sent</td>
            <td style="padding:8px 12px;text-align:right;">${stats.sent}</td>
          </tr>
          <tr style="background-color:#f8f9fa;">
            <td style="padding:8px 12px;font-weight:bold;${redStyle(stats.failed)}">Failed</td>
            <td style="padding:8px 12px;text-align:right;${redStyle(stats.failed)}">${stats.failed}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 20px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1a73e8;">By Channel</h2>
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background-color:#e8f5e9;">
            <td style="padding:8px 12px;">Webhook</td>
            <td style="padding:8px 12px;text-align:right;">${stats.channels.crm_webhook.total - stats.channels.crm_webhook.failed} sent / ${stats.channels.crm_webhook.failed} failed</td>
          </tr>
          <tr style="background-color:#e3f2fd;">
            <td style="padding:8px 12px;">Email</td>
            <td style="padding:8px 12px;text-align:right;">${stats.channels.email.total - stats.channels.email.failed} sent / ${stats.channels.email.failed} failed</td>
          </tr>
          <tr style="background-color:#fff3e0;">
            <td style="padding:8px 12px;">SMS</td>
            <td style="padding:8px 12px;text-align:right;">${stats.channels.sms.total - stats.channels.sms.failed} sent / ${stats.channels.sms.failed} failed</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;border-top:1px solid #e0e0e0;color:#666;font-size:12px;">
        Delivered by PPL Lead Management
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildDigestSmsBody(stats: DigestStats, shortDate: string): string {
  const wh = stats.channels.crm_webhook
  const em = stats.channels.email
  const sm = stats.channels.sms
  return [
    `Daily Digest - ${shortDate}`,
    `Leads: ${stats.leads.received} received, ${stats.leads.assigned} assigned, ${stats.leads.unassigned} unassigned`,
    `Deliveries: ${stats.sent} sent, ${stats.failed} failed`,
    `Webhook: ${wh.total - wh.failed}/${wh.failed} | Email: ${em.total - em.failed}/${em.failed} | SMS: ${sm.total - sm.failed}/${sm.failed}`,
  ].join('\n')
}

async function queryDigestStats(
  supabase: ReturnType<typeof createClient>,
  periodStart: string,
  periodEnd: string,
): Promise<DigestStats> {
  const [
    leadsReceived,
    leadsAssigned,
    leadsUnassigned,
    totalDeliveries,
    sentDeliveries,
    failedDeliveries,
    webhookTotal,
    webhookFailed,
    emailTotal,
    emailFailed,
    smsTotal,
    smsFailed,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd),
    supabase.from('leads').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('status', 'assigned'),
    supabase.from('leads').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('status', 'unassigned'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('status', 'sent'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'crm_webhook'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'crm_webhook').in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'email'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'email').in('status', ['failed', 'failed_permanent']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'sms'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true })
      .gte('created_at', periodStart).lte('created_at', periodEnd).eq('channel', 'sms').in('status', ['failed', 'failed_permanent']),
  ])

  return {
    leads: {
      received: leadsReceived.count ?? 0,
      assigned: leadsAssigned.count ?? 0,
      unassigned: leadsUnassigned.count ?? 0,
    },
    total: totalDeliveries.count ?? 0,
    sent: sentDeliveries.count ?? 0,
    failed: failedDeliveries.count ?? 0,
    channels: {
      crm_webhook: { total: webhookTotal.count ?? 0, failed: webhookFailed.count ?? 0 },
      email: { total: emailTotal.count ?? 0, failed: emailFailed.count ?? 0 },
      sms: { total: smsTotal.count ?? 0, failed: smsFailed.count ?? 0 },
    },
  }
}

Deno.serve(async (req) => {
  // Auth check: verify service role Bearer token
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const ghlToken = Deno.env.get('GHL_API_TOKEN')
  if (!ghlToken) {
    return new Response(JSON.stringify({ error: 'GHL_API_TOKEN not configured' }), { status: 500 })
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Get admin contact ID from admin_settings
  const { data: settings, error: settingsError } = await supabase
    .from('admin_settings')
    .select('alert_ghl_contact_id')
    .limit(1)
    .single()

  if (settingsError || !settings?.alert_ghl_contact_id) {
    console.error('send-digest: admin_settings not found or missing contact ID', settingsError)
    return new Response(
      JSON.stringify({ error: 'admin_settings not configured', detail: settingsError?.message }),
      { status: 500 },
    )
  }

  const adminContactId = settings.alert_ghl_contact_id

  // Determine time period from last successful digest run
  const { data: lastRun } = await supabase
    .from('digest_runs')
    .select('period_end')
    .eq('status', 'sent')
    .order('period_end', { ascending: false })
    .limit(1)
    .single()

  const periodStart = lastRun?.period_end ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const periodEnd = new Date().toISOString()

  // Query stats (12 parallel counts)
  let stats: DigestStats
  try {
    stats = await queryDigestStats(supabase, periodStart, periodEnd)
  } catch (err) {
    console.error('send-digest: stats query failed', err)
    await supabase.from('digest_runs').insert({
      period_start: periodStart,
      period_end: periodEnd,
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'stats_query_failed',
    })
    return new Response(JSON.stringify({ error: 'stats_query_failed' }), { status: 500 })
  }

  // Build messages
  const now = new Date()
  const dateStr = formatDate(now)
  const shortDate = formatShortDate(now)
  const emailHtml = buildDigestEmailHtml(stats, dateStr)
  const smsBody = buildDigestSmsBody(stats, shortDate)
  const fromEmail = Deno.env.get('GHL_FROM_EMAIL') ?? 'leads@pplleads.com'

  let emailOk = false
  let smsOk = false
  let emailError = ''
  let smsError = ''

  // Send email via GHL (CRITICAL: use html field, NOT message)
  try {
    const emailResponse = await fetch(`${GHL_BASE_URL}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ghlToken}`,
        'Version': GHL_API_VERSION,
      },
      body: JSON.stringify({
        type: 'Email',
        contactId: adminContactId,
        subject: `Daily Digest - ${dateStr}`,
        html: emailHtml,
        emailFrom: fromEmail,
      }),
    })

    if (emailResponse.ok) {
      emailOk = true
    } else {
      const body = await emailResponse.text().catch(() => '')
      emailError = `HTTP ${emailResponse.status}: ${body}`
      console.error('send-digest: email failed', emailError)
    }
  } catch (err) {
    emailError = err instanceof Error ? err.message : 'email_network_error'
    console.error('send-digest: email network error', emailError)
  }

  // Send SMS via GHL
  try {
    const smsResponse = await fetch(`${GHL_BASE_URL}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ghlToken}`,
        'Version': GHL_API_VERSION,
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId: adminContactId,
        message: smsBody,
      }),
    })

    if (smsResponse.ok) {
      smsOk = true
    } else {
      const body = await smsResponse.text().catch(() => '')
      smsError = `HTTP ${smsResponse.status}: ${body}`
      console.error('send-digest: sms failed', smsError)
    }
  } catch (err) {
    smsError = err instanceof Error ? err.message : 'sms_network_error'
    console.error('send-digest: sms network error', smsError)
  }

  // Record digest run
  const bothFailed = !emailOk && !smsOk
  const partialFailure = (emailOk && !smsOk) || (!emailOk && smsOk)
  const errors: string[] = []
  if (emailError) errors.push(`email: ${emailError}`)
  if (smsError) errors.push(`sms: ${smsError}`)

  await supabase.from('digest_runs').insert({
    period_start: periodStart,
    period_end: periodEnd,
    status: bothFailed ? 'failed' : 'sent',
    stats: {
      ...stats,
      delivery: { email: emailOk, sms: smsOk },
      ...(partialFailure ? { partial_failure: true } : {}),
    },
    error_message: errors.length > 0 ? errors.join('; ') : null,
  })

  if (bothFailed) {
    return new Response(
      JSON.stringify({ error: 'both_sends_failed', detail: errors }),
      { status: 502 },
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      email: emailOk,
      sms: smsOk,
      period: { start: periodStart, end: periodEnd },
      stats,
    }),
    { status: 200 },
  )
})
