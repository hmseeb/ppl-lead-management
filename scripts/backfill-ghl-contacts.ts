/**
 * Backfill brokers with real GHL contact IDs, delivery emails, and delivery phones.
 *
 * For each broker with a placeholder ghl_contact_id:
 *   1. Search GHL by email
 *   2. If not found, create the contact in GHL
 *   3. Fetch the full contact to get phone/email
 *   4. Update broker row with real ghl_contact_id + delivery_email + delivery_phone
 */

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'
const GHL_API_TOKEN = process.env.GHL_API_TOKEN!
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface Broker {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company_name: string | null
  ghl_contact_id: string
  delivery_email: string | null
  delivery_phone: string | null
  delivery_methods: string[] | null
}

interface GhlContact {
  id: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  companyName?: string
}

// Known placeholder patterns
const FAKE_PHONES = ['+923034882555']
const FAKE_EMAILS = ['hsbazr@gmail.com', 'dan@themarketingman.co', 'dan@danthemktman.com']

// IDs created in the wrong GHL location (LaJsNDnWv3N8NZXg7ROp / Black Hills)
const WRONG_LOCATION_IDS = [
  'kUmkvHkcO0t80w1I9rQ6', // Rich Ciufo
  'DLdWf3gtaiYLoJkwKNp1', // Rafael Vasquez
  'gtCiDyodwZj9cvOOIJcD', // Ronequal Williams
  'ebNgNxdA0fBTKGv9A3NQ', // Annettee Blanchard
  'BgHwNi56B86gEneQtrl1', // Fernando Villa
  'lzBCJyPLGqfGkk2IsPe7', // Grant Merrill
  'oZ7MGurckk4yxTvp3mA4', // Brian Oliver
]

function isFakeGhlId(id: string): boolean {
  return /^ghl_/.test(id) || /^test_/.test(id) || id === 'abc123xyz' || WRONG_LOCATION_IDS.includes(id)
}

function isFakeDeliveryEmail(email: string | null): boolean {
  return !!email && FAKE_EMAILS.includes(email)
}

function isFakeDeliveryPhone(phone: string | null): boolean {
  return !!phone && FAKE_PHONES.includes(phone)
}

function needsFix(broker: Broker): boolean {
  return (
    isFakeGhlId(broker.ghl_contact_id) ||
    isFakeDeliveryEmail(broker.delivery_email) ||
    isFakeDeliveryPhone(broker.delivery_phone)
  )
}

async function ghlFetch(path: string, options: RequestInit = {}) {
  return fetch(`${GHL_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GHL_API_TOKEN}`,
      'Version': GHL_API_VERSION,
      ...(options.headers || {}),
    },
  })
}

async function searchContact(email: string): Promise<GhlContact | null> {
  const res = await ghlFetch(
    `/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(email)}&limit=1`
  )
  if (!res.ok) {
    console.error(`  search failed (${res.status}):`, await res.text())
    return null
  }
  const data = await res.json()
  const contacts = data.contacts || []
  return contacts.length > 0 ? contacts[0] : null
}

async function getContact(contactId: string): Promise<GhlContact | null> {
  const res = await ghlFetch(`/contacts/${contactId}`)
  if (!res.ok) {
    console.error(`  get contact failed (${res.status}):`, await res.text())
    return null
  }
  const data = await res.json()
  return data.contact || null
}

async function createContact(broker: Broker): Promise<GhlContact | null> {
  const body: Record<string, string> = {
    locationId: GHL_LOCATION_ID,
    firstName: broker.first_name,
    lastName: broker.last_name,
    email: broker.email,
  }
  if (broker.phone && !isFakeDeliveryPhone(broker.phone)) body.phone = broker.phone
  if (broker.company_name) body.companyName = broker.company_name

  const res = await ghlFetch('/contacts/', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 409) {
      try {
        const errData = JSON.parse(errText)
        if (errData.contactId) return getContact(errData.contactId)
      } catch {}
      console.error(`  conflict creating contact, searching again...`)
      return searchContact(broker.email)
    }
    console.error(`  create failed (${res.status}):`, errText)
    return null
  }

  const data = await res.json()
  return data.contact || null
}

async function updateBroker(brokerId: string, updates: Record<string, string | null>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/brokers?id=eq.${brokerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(updates),
  })
  return res.ok
}

async function main() {
  console.log('=== GHL Contact Backfill ===\n')
  console.log('Fetching brokers...')

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/brokers?select=id,first_name,last_name,email,phone,company_name,ghl_contact_id,delivery_email,delivery_phone,delivery_methods&order=created_at`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  )
  const brokers: Broker[] = await res.json()

  const toFix = brokers.filter(b => needsFix(b))
  console.log(`Found ${toFix.length} brokers needing fixes\n`)

  let updated = 0
  let createdInGhl = 0
  let failed = 0

  for (const broker of toFix) {
    const name = `${broker.first_name} ${broker.last_name}`
    console.log(`--- [${name}] (${broker.email}) ---`)
    console.log(`  current ghl_id:        ${broker.ghl_contact_id}`)
    console.log(`  current delivery_email: ${broker.delivery_email}`)
    console.log(`  current delivery_phone: ${broker.delivery_phone}`)
    console.log(`  delivery_methods:       ${JSON.stringify(broker.delivery_methods)}`)

    // Skip test brokers
    if (['test@example.com', 'john@example.com', 'hsbazr@gmail.com'].includes(broker.email)) {
      console.log(`  SKIPPING (test broker)\n`)
      continue
    }

    // Resolve real GHL contact
    let contact: GhlContact | null = null

    if (isFakeGhlId(broker.ghl_contact_id)) {
      console.log(`  searching GHL by email...`)
      contact = await searchContact(broker.email)

      if (contact) {
        console.log(`  found: ${contact.id}`)
      } else {
        console.log(`  not found, creating in GHL...`)
        contact = await createContact(broker)
        if (contact) {
          console.log(`  created: ${contact.id}`)
          createdInGhl++
        }
      }
    } else {
      // Already has real GHL ID, just fetch the contact for email/phone
      console.log(`  ghl_id looks real, fetching contact details...`)
      contact = await getContact(broker.ghl_contact_id)
    }

    if (!contact) {
      console.log(`  FAILED - could not resolve GHL contact\n`)
      failed++
      continue
    }

    // Build update payload
    const updates: Record<string, string | null> = {}

    if (isFakeGhlId(broker.ghl_contact_id)) {
      updates.ghl_contact_id = contact.id
    }

    // Fix delivery_email: use GHL contact email, or broker's own email
    const methods = broker.delivery_methods || []
    if (methods.includes('email')) {
      if (isFakeDeliveryEmail(broker.delivery_email) || !broker.delivery_email) {
        const realEmail = contact.email || broker.email
        updates.delivery_email = realEmail
      }
    }

    // Fix delivery_phone: use GHL contact phone, or broker's own phone
    if (methods.includes('sms')) {
      if (isFakeDeliveryPhone(broker.delivery_phone) || !broker.delivery_phone) {
        const realPhone = contact.phone || broker.phone || null
        updates.delivery_phone = realPhone
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  no updates needed\n`)
      continue
    }

    console.log(`  updating:`, JSON.stringify(updates, null, 2))
    const ok = await updateBroker(broker.id, updates)
    if (ok) {
      console.log(`  done ✓\n`)
      updated++
    } else {
      console.log(`  FAILED to update broker\n`)
      failed++
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n=== Summary ===`)
  console.log(`Brokers updated:     ${updated}`)
  console.log(`Created in GHL:      ${createdInGhl}`)
  console.log(`Failed:              ${failed}`)
}

main().catch(console.error)
