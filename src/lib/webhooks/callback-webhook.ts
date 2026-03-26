export interface CallbackWebhookParams {
  type: 'callback_created' | 'callback_cancelled'
  callback: {
    id: string
    scheduled_time: string
    status: string
    notes: string | null
    created_at: string
  }
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

const CALLBACK_WEBHOOK_URL = process.env.CALLBACK_WEBHOOK_URL

export async function fireCallbackWebhook(params: CallbackWebhookParams): Promise<void> {
  const { type, callback, lead, broker } = params

  if (!CALLBACK_WEBHOOK_URL) {
    console.error('callback-webhook: CALLBACK_WEBHOOK_URL not set')
    return
  }

  const payload = {
    type,
    callback,
    lead,
    broker: {
      id: broker.id,
      name: [broker.first_name, broker.last_name].filter(Boolean).join(' '),
      email: broker.email,
      phone: broker.phone,
      company: broker.company_name,
    },
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    await fetch(CALLBACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (err) {
    console.error('callback-webhook:', type, err)
  } finally {
    clearTimeout(timeout)
  }
}
