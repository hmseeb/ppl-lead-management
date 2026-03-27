/**
 * Test script for POST /api/leads/incoming webhook endpoint.
 * Runs 6 test scenarios against the local dev server.
 *
 * Prerequisites: dev server running at http://localhost:3000
 * Usage: bun run scripts/test-webhook-post.ts
 */

import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'http://localhost:3000/api/leads/incoming'
const SUPABASE_URL = 'https://kovcroqqudozpaocpeks.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdmNyb3FxdWRvenBhb2NwZWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzMzM4OCwiZXhwIjoyMDg4ODA5Mzg4fQ.0qw5COcvqsa3xshZJpOztpLThnKoNtDUBnAL_gnO_jk'

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

let passed = 0
let failed = 0

function assert(name: string, condition: boolean, expected: string, actual: string) {
  if (condition) {
    console.log(`  PASS: ${name}`)
    passed++
  } else {
    console.log(`  FAIL: ${name}`)
    console.log(`    Expected: ${expected}`)
    console.log(`    Actual:   ${actual}`)
    failed++
  }
}

async function postWebhook(body: unknown, options?: { raw?: boolean }): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {}
  let rawBody: string

  if (options?.raw) {
    rawBody = body as string
    headers['Content-Type'] = 'text/plain'
  } else {
    rawBody = JSON.stringify(body)
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: rawBody,
  })

  let data: any
  try {
    data = await res.json()
  } catch {
    data = null
  }

  return { status: res.status, data }
}

async function cleanup() {
  // Delete test leads (ghl_contact_id starting with test_)
  await sb.from('unassigned_queue').delete().like('lead_id', '%')
  // First get test lead IDs
  const { data: testLeads } = await sb
    .from('leads')
    .select('id')
    .like('ghl_contact_id', 'test_%')

  if (testLeads && testLeads.length > 0) {
    const ids = testLeads.map((l) => l.id)
    await sb.from('unassigned_queue').delete().in('lead_id', ids)
    await sb.from('activity_log').delete().in('lead_id', ids)
    await sb.from('leads').delete().like('ghl_contact_id', 'test_%')
  }
}

// =====================================================================
// Test 1: Valid lead payload
// =====================================================================
async function test1_validPayload() {
  console.log('\nTest 1: Valid lead payload')

  const { status, data } = await postWebhook({
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    vertical: 'MCA',
    credit_score: 700,
    funding_amount: 50000,
    ghl_contact_id: 'test_webhook_001',
  })

  assert('status is 200', status === 200, '200', String(status))
  assert('response has lead_id', !!data?.lead_id, 'truthy', String(data?.lead_id))
  assert('response has assignment', !!data?.assignment, 'truthy', JSON.stringify(data?.assignment))
  assert(
    'assignment has status',
    ['assigned', 'unassigned', 'error'].includes(data?.assignment?.status),
    'assigned|unassigned|error',
    data?.assignment?.status
  )
  // broker object should be present when assigned, null otherwise
  if (data?.assignment?.status === 'assigned') {
    assert('broker object present', !!data?.broker, 'truthy', JSON.stringify(data?.broker))
    assert('broker has phone', 'phone' in (data?.broker ?? {}), 'true', 'false')
    assert('broker has name', 'name' in (data?.broker ?? {}), 'true', 'false')
    assert('broker has ghl_contact_id', 'ghl_contact_id' in (data?.broker ?? {}), 'true', 'false')
  } else {
    assert('broker is null when not assigned', data?.broker === null, 'null', String(data?.broker))
  }
}

// =====================================================================
// Test 2: Duplicate ghl_contact_id (idempotency)
// =====================================================================
async function test2_duplicateIdempotency() {
  console.log('\nTest 2: Duplicate ghl_contact_id (idempotency)')

  const { status, data } = await postWebhook({
    first_name: 'Test',
    last_name: 'Duplicate',
    vertical: 'MCA',
    ghl_contact_id: 'test_webhook_001', // same as test 1
  })

  assert('status is 200 (not 409)', status === 200, '200', String(status))
  assert('response indicates duplicate', data?.status === 'duplicate', 'duplicate', data?.status)
  assert('response has lead_id', !!data?.lead_id, 'truthy', String(data?.lead_id))

  // Verify only 1 lead row exists for that ghl_contact_id
  const { data: leads } = await sb
    .from('leads')
    .select('id')
    .eq('ghl_contact_id', 'test_webhook_001')

  assert('only 1 lead row exists', leads?.length === 1, '1', String(leads?.length))
}

// =====================================================================
// Test 3: Malformed payload (missing required field)
// =====================================================================
async function test3_missingRequired() {
  console.log('\nTest 3: Malformed payload (missing ghl_contact_id)')

  const { status, data } = await postWebhook({
    first_name: 'NoContact',
    vertical: 'MCA',
    // ghl_contact_id missing
  })

  assert('status is 400', status === 400, '400', String(status))
  assert('error is invalid_payload', data?.error === 'invalid_payload', 'invalid_payload', data?.error)
  assert('has details', !!data?.details, 'truthy', JSON.stringify(data?.details))
}

// =====================================================================
// Test 4: Completely invalid JSON
// =====================================================================
async function test4_invalidJson() {
  console.log('\nTest 4: Completely invalid JSON')

  const { status, data } = await postWebhook('not json at all {{{', { raw: true })

  assert('status is 400', status === 400, '400', String(status))
  assert('error is invalid_json', data?.error === 'invalid_json', 'invalid_json', data?.error)
}

// =====================================================================
// Test 5: Minimal valid payload (only required fields)
// =====================================================================
async function test5_minimalPayload() {
  console.log('\nTest 5: Minimal valid payload')

  const { status, data } = await postWebhook({
    vertical: 'SBA',
    ghl_contact_id: 'test_webhook_minimal',
  })

  assert('status is 200', status === 200, '200', String(status))
  assert('response has lead_id', !!data?.lead_id, 'truthy', String(data?.lead_id))

  // Verify the lead was stored with nulls for optional fields
  const { data: lead } = await sb
    .from('leads')
    .select('first_name, email, credit_score, vertical')
    .eq('ghl_contact_id', 'test_webhook_minimal')
    .single()

  assert('first_name is null', lead?.first_name === null, 'null', String(lead?.first_name))
  assert('email is null', lead?.email === null, 'null', String(lead?.email))
  assert('credit_score is null', lead?.credit_score === null, 'null', String(lead?.credit_score))
  assert('vertical is SBA', lead?.vertical === 'SBA', 'SBA', String(lead?.vertical))
}

// =====================================================================
// Test 6: Credit score as string (z.coerce test)
// =====================================================================
async function test6_coercedCreditScore() {
  console.log('\nTest 6: Credit score as string (coercion)')

  const { status, data } = await postWebhook({
    first_name: 'Coerce',
    vertical: 'MCA',
    credit_score: '720', // string, should be coerced to number
    ghl_contact_id: 'test_webhook_coerce',
  })

  assert('status is 200', status === 200, '200', String(status))
  assert('response has lead_id', !!data?.lead_id, 'truthy', String(data?.lead_id))

  // Verify stored as integer
  const { data: lead } = await sb
    .from('leads')
    .select('credit_score')
    .eq('ghl_contact_id', 'test_webhook_coerce')
    .single()

  assert('credit_score stored as 720', lead?.credit_score === 720, '720', String(lead?.credit_score))
}

// =====================================================================
// Run all tests
// =====================================================================
async function main() {
  console.log('=== POST /api/leads/incoming Test Suite ===')
  console.log(`Target: ${BASE_URL}`)
  console.log('')
  console.log('NOTE: dev server must be running at http://localhost:3000')
  console.log('')

  // Clean up any leftover test data
  await cleanup()

  try {
    await test1_validPayload()
    await test2_duplicateIdempotency()
    await test3_missingRequired()
    await test4_invalidJson()
    await test5_minimalPayload()
    await test6_coercedCreditScore()
  } catch (err) {
    console.error('\nFATAL ERROR:', err)
    failed++
  }

  // Final cleanup
  await cleanup()

  console.log('\n=== Results ===')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(failed === 0 ? '\nALL TESTS PASSED' : '\nSOME TESTS FAILED')
  process.exit(failed > 0 ? 1 : 0)
}

main()
