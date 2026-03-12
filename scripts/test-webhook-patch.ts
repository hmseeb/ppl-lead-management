/**
 * Test script for PATCH /api/leads/update endpoint.
 * Runs 5 test scenarios against the local dev server.
 *
 * Prerequisites: dev server running at http://localhost:3000
 * Usage: bun run scripts/test-webhook-patch.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kovcroqqudozpaocpeks.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdmNyb3FxdWRvenBhb2NwZWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzMzM4OCwiZXhwIjoyMDg4ODA5Mzg4fQ.0qw5COcvqsa3xshZJpOztpLThnKoNtDUBnAL_gnO_jk'

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const API_URL = 'http://localhost:3000/api/leads/update'
const TEST_GHL_ID = 'test_patch_lead_' + Date.now()

// Use an existing broker ID from DB for simulating pre-assigned leads
const BROKER_1 = '9e2ec712-e174-499f-b5ed-dab357e5c23a'

let passed = 0
let failed = 0
let testLeadId: string | null = null

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

async function setup() {
  // Insert a test lead that simulates an already-assigned lead
  const { data, error } = await sb
    .from('leads')
    .insert({
      ghl_contact_id: TEST_GHL_ID,
      first_name: 'PatchTest',
      last_name: 'User',
      email: 'patchtest@example.com',
      vertical: 'MCA',
      credit_score: 700,
      status: 'assigned',
      assigned_broker_id: BROKER_1,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Setup failed: ${error.message}`)
  testLeadId = data.id
  console.log(`Setup: created test lead ${testLeadId} (ghl: ${TEST_GHL_ID})`)
}

async function cleanup() {
  // Clean up test data
  if (testLeadId) {
    await sb.from('leads').delete().eq('id', testLeadId)
    console.log('Cleanup: removed test lead')
  }
}

// =====================================================================
// Test 1: Update AI call notes on assigned lead
// =====================================================================
async function test1_updateAiCallNotes() {
  console.log('\nTest 1: Update AI call notes')

  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ghl_contact_id: TEST_GHL_ID,
      ai_call_notes: 'Spoke with owner, interested in 50k line of credit',
      ai_call_status: 'completed',
    }),
  })

  const json = await res.json()

  assert('status is 200', res.status === 200, '200', String(res.status))
  assert('returns lead_id', !!json.lead_id, 'truthy', String(json.lead_id))
  assert(
    'updated_fields includes ai_call_notes',
    json.updated_fields?.includes('ai_call_notes'),
    'true',
    String(json.updated_fields)
  )

  // Verify in DB
  const { data: lead } = await sb
    .from('leads')
    .select('ai_call_notes, ai_call_status, assigned_broker_id, status')
    .eq('id', testLeadId!)
    .single()

  assert(
    'ai_call_notes updated in DB',
    lead?.ai_call_notes === 'Spoke with owner, interested in 50k line of credit',
    'Spoke with owner...',
    lead?.ai_call_notes ?? 'null'
  )
  assert(
    'ai_call_status updated in DB',
    lead?.ai_call_status === 'completed',
    'completed',
    lead?.ai_call_status ?? 'null'
  )
  assert(
    'assigned_broker_id UNCHANGED',
    lead?.assigned_broker_id === BROKER_1,
    BROKER_1,
    lead?.assigned_broker_id ?? 'null'
  )
  assert(
    'status UNCHANGED (still assigned)',
    lead?.status === 'assigned',
    'assigned',
    lead?.status ?? 'null'
  )
}

// =====================================================================
// Test 2: Non-existent ghl_contact_id returns 404
// =====================================================================
async function test2_nonExistentContact() {
  console.log('\nTest 2: Non-existent ghl_contact_id')

  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ghl_contact_id: 'does_not_exist_xyz_' + Date.now(),
    }),
  })

  const json = await res.json()

  assert('status is 404', res.status === 404, '404', String(res.status))
  assert('error is lead_not_found', json.error === 'lead_not_found', 'lead_not_found', json.error)
}

// =====================================================================
// Test 3: Missing ghl_contact_id returns 400
// =====================================================================
async function test3_missingContactId() {
  console.log('\nTest 3: Missing ghl_contact_id')

  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ai_call_notes: 'test' }),
  })

  const json = await res.json()

  assert('status is 400', res.status === 400, '400', String(res.status))
  assert('error is validation_error', json.error === 'validation_error', 'validation_error', json.error)
}

// =====================================================================
// Test 4: Update multiple fields at once
// =====================================================================
async function test4_multiFieldUpdate() {
  console.log('\nTest 4: Update multiple fields at once')

  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ghl_contact_id: TEST_GHL_ID,
      first_name: 'Updated',
      email: 'updated@example.com',
      credit_score: 780,
    }),
  })

  const json = await res.json()

  assert('status is 200', res.status === 200, '200', String(res.status))
  assert(
    'updated_fields includes first_name',
    json.updated_fields?.includes('first_name'),
    'true',
    String(json.updated_fields)
  )
  assert(
    'updated_fields includes email',
    json.updated_fields?.includes('email'),
    'true',
    String(json.updated_fields)
  )
  assert(
    'updated_fields includes credit_score',
    json.updated_fields?.includes('credit_score'),
    'true',
    String(json.updated_fields)
  )

  // Verify in DB
  const { data: lead } = await sb
    .from('leads')
    .select('first_name, email, credit_score, assigned_broker_id, assigned_order_id, status')
    .eq('id', testLeadId!)
    .single()

  assert('first_name updated', lead?.first_name === 'Updated', 'Updated', lead?.first_name ?? 'null')
  assert('email updated', lead?.email === 'updated@example.com', 'updated@example.com', lead?.email ?? 'null')
  assert('credit_score updated', lead?.credit_score === 780, '780', String(lead?.credit_score))
  assert('assigned_broker_id still intact', lead?.assigned_broker_id === BROKER_1, BROKER_1, lead?.assigned_broker_id ?? 'null')
  assert('status still assigned', lead?.status === 'assigned', 'assigned', lead?.status ?? 'null')
}

// =====================================================================
// Test 5: Invalid JSON body returns 400
// =====================================================================
async function test5_invalidJson() {
  console.log('\nTest 5: Invalid JSON body')

  const res = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: '{"broken json',
  })

  const json = await res.json()

  assert('status is 400', res.status === 400, '400', String(res.status))
  assert('error is invalid_json', json.error === 'invalid_json', 'invalid_json', json.error)
}

// =====================================================================
// Run all tests
// =====================================================================
async function main() {
  console.log('=== PATCH /api/leads/update Test Suite ===')
  console.log(`Target: ${API_URL}`)
  console.log('')

  try {
    await setup()
    await test1_updateAiCallNotes()
    await test2_nonExistentContact()
    await test3_missingContactId()
    await test4_multiFieldUpdate()
    await test5_invalidJson()
  } catch (err) {
    console.error('\nFATAL ERROR:', err)
    failed++
  }

  // Cleanup
  await cleanup()

  console.log('\n=== Results ===')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(failed === 0 ? '\nALL TESTS PASSED' : '\nSOME TESTS FAILED')
  process.exit(failed > 0 ? 1 : 0)
}

main()
