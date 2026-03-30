import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CallbackRow {
  id: string
  scheduled_time: string
  status: string
  notes: string | null
  created_at: string
  lead: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    vertical: string | null
    credit_score: number | null
    funding_amount: number | null
    state: string | null
  }
  broker: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
    company_name: string | null
    crm_webhook_url: string | null
  }
}

function buildPayload(
  type: 'callback_due' | 'callback_reminder',
  row: CallbackRow,
  reminderInterval?: '24h' | '2h' | '15m',
) {
  return {
    type,
    ...(reminderInterval && { reminder_interval: reminderInterval }),
    callback: {
      id: row.id,
      scheduled_time: row.scheduled_time,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
    },
    lead: {
      id: row.lead.id,
      first_name: row.lead.first_name,
      last_name: row.lead.last_name,
      email: row.lead.email,
      phone: row.lead.phone,
      vertical: row.lead.vertical,
      credit_score: row.lead.credit_score,
      funding_amount: row.lead.funding_amount,
      state: row.lead.state,
    },
    broker: {
      id: row.broker.id,
      name: [row.broker.first_name, row.broker.last_name]
        .filter(Boolean)
        .join(' '),
      email: row.broker.email,
      phone: row.broker.phone,
      company: row.broker.company_name,
    },
  }
}

async function fireWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    return true
  } catch (err) {
    console.error('fire-callback-webhooks:', payload.type, err)
    return false
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req) => {
  // Auth check: verify service role Bearer token
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
    })
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const callbackWebhookUrl = Deno.env.get('CALLBACK_WEBHOOK_URL')
  const supabase = createClient(supabaseUrl, serviceKey)

  if (!callbackWebhookUrl) {
    return new Response(JSON.stringify({ error: 'CALLBACK_WEBHOOK_URL not set' }), { status: 500 })
  }

  let dueFired = 0
  let remindersFired = 0

  // 1. Query due callbacks: pending + scheduled_time <= now
  const { data: dueCallbacks, error: dueError } = await supabase
    .from('callbacks')
    .select(
      `
      id, scheduled_time, status, notes, created_at,
      lead:leads!callbacks_lead_id_fkey (
        id, first_name, last_name, email, phone,
        vertical, credit_score, funding_amount, state
      ),
      broker:brokers!callbacks_broker_id_fkey (
        id, first_name, last_name, email, phone,
        company_name, crm_webhook_url
      )
    `,
    )
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toISOString())

  if (dueError) {
    console.error('fire-callback-webhooks: due query error', dueError)
  }

  // Fire callback_due webhooks and mark as completed
  for (const row of (dueCallbacks ?? []) as unknown as CallbackRow[]) {
    const payload = buildPayload('callback_due', row)
    const ok = await fireWebhook(callbackWebhookUrl, payload)

    if (ok) dueFired++

    // Mark callback as completed regardless of webhook success
    // (fire-and-forget pattern, matching existing webhook behavior)
    const { error: updateError } = await supabase
      .from('callbacks')
      .update({ status: 'completed' })
      .eq('id', row.id)

    if (updateError) {
      console.error(
        'fire-callback-webhooks: failed to complete callback',
        row.id,
        updateError,
      )
    }
  }

  // 2. Fire reminders at 3 tiers: 24h, 2h, 15min before scheduled_time
  //    Each tier has its own sent_at column to prevent duplicates.
  const now = new Date()

  const reminderTiers = [
    { interval: '24h' as const, windowMs: 24 * 60 * 60 * 1000, bufferMs: 30 * 60 * 1000, sentCol: 'reminder_24h_sent_at' },
    { interval: '2h' as const, windowMs: 2 * 60 * 60 * 1000, bufferMs: 10 * 60 * 1000, sentCol: 'reminder_2h_sent_at' },
    { interval: '15m' as const, windowMs: 15 * 60 * 1000, bufferMs: 5 * 60 * 1000, sentCol: 'reminder_sent_at' },
  ]

  for (const tier of reminderTiers) {
    // Query window: scheduled_time between now + tier - buffer and now + tier + buffer
    // Buffer accounts for cron cycle drift
    const windowStart = new Date(now.getTime() + tier.windowMs - tier.bufferMs)
    const windowEnd = new Date(now.getTime() + tier.windowMs + tier.bufferMs)

    const { data: reminderCallbacks, error: reminderError } = await supabase
      .from('callbacks')
      .select(
        `
        id, scheduled_time, status, notes, created_at,
        lead:leads!callbacks_lead_id_fkey (
          id, first_name, last_name, email, phone,
          vertical, credit_score, funding_amount, state
        ),
        broker:brokers!callbacks_broker_id_fkey (
          id, first_name, last_name, email, phone,
          company_name, crm_webhook_url
        )
      `,
      )
      .eq('status', 'pending')
      .gt('scheduled_time', windowStart.toISOString())
      .lte('scheduled_time', windowEnd.toISOString())
      .is(tier.sentCol, null)

    if (reminderError) {
      console.error(
        `fire-callback-webhooks: ${tier.interval} reminder query error`,
        reminderError,
      )
      continue
    }

    for (const row of (reminderCallbacks ?? []) as unknown as CallbackRow[]) {
      const payload = buildPayload('callback_reminder', row, tier.interval)
      const ok = await fireWebhook(callbackWebhookUrl, payload)

      if (ok) remindersFired++

      // Mark this tier's reminder as sent
      const { error: updateError } = await supabase
        .from('callbacks')
        .update({ [tier.sentCol]: now.toISOString() })
        .eq('id', row.id)

      if (updateError) {
        console.error(
          `fire-callback-webhooks: failed to set ${tier.sentCol}`,
          row.id,
          updateError,
        )
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      due_fired: dueFired,
      reminders_fired: remindersFired,
    }),
    { status: 200 },
  )
})
