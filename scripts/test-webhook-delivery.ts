/**
 * Test script for the webhook delivery pipeline.
 * Validates: delivery records on assignment, payload contents,
 * no delivery for brokers without webhook URL, and status tracking.
 *
 * This script tests against live Supabase directly (no dev server needed).
 * It creates its own test brokers, orders, and leads, then cleans up.
 *
 * Usage: bun run scripts/test-webhook-delivery.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kovcroqqudozpaocpeks.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdmNyb3FxdWRvenBhb2NwZWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzMzM4OCwiZXhwIjoyMDg4ODA5Mzg4fQ.0qw5COcvqsa3xshZJpOztpLThnKoNtDUBnAL_gnO_jk'

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Fixed UUIDs for test data (prefixed with ddddddd to avoid collision)
const TEST_BROKER_WITH_URL = 'dddddddd-0001-4000-8000-000000000001'
const TEST_BROKER_NO_URL = 'dddddddd-0002-4000-8000-000000000002'
const TEST_ORDER_WITH_URL = 'dddddddd-0003-4000-8000-000000000001'
const TEST_ORDER_NO_URL = 'dddddddd-0004-4000-8000-000000000001'
const TEST_LEAD_1 = 'dddddddd-0005-4000-8000-000000000001'
const TEST_LEAD_2 = 'dddddddd-0006-4000-8000-000000000001'

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

async function cleanup() {
  // Delete in FK-safe reverse order
  const testLeadIds = [TEST_LEAD_1, TEST_LEAD_2]
  const testOrderIds = [TEST_ORDER_WITH_URL, TEST_ORDER_NO_URL]
  const testBrokerIds = [TEST_BROKER_WITH_URL, TEST_BROKER_NO_URL]

  // deliveries first (references leads, brokers, orders)
  await sb.from('deliveries').delete().in('lead_id', testLeadIds)

  // activity_log entries for our test leads
  await sb.from('activity_log').delete().in('lead_id', testLeadIds)

  // unassigned_queue entries
  await sb.from('unassigned_queue').delete().in('lead_id', testLeadIds)

  // leads (references brokers via assigned_broker_id)
  await sb.from('leads').delete().in('id', testLeadIds)

  // orders (references brokers)
  await sb.from('orders').delete().in('id', testOrderIds)

  // brokers
  await sb.from('brokers').delete().in('id', testBrokerIds)
}

async function seedTestData() {
  // Create two test brokers: one with webhook URL, one without
  // Include all NOT NULL columns from the brokers table
  const baseBroker = {
    phone: '5550000000',
    company_name: 'Test Corp',
    state: 'Texas',
    primary_vertical: 'MCA',
    secondary_vertical: 'SBA',
    batch_size: 10,
    deal_amount: 500,
    delivery_email: 'test@test.com',
    delivery_phone: '5550000000',
    contact_hours: 'business',
    weekend_pause: false,
    current_step: 7,
    status: 'completed',
    assignment_status: 'active',
    delivery_methods: ['email'],
  }

  const { error: brokerErr } = await sb.from('brokers').insert([
    {
      ...baseBroker,
      id: TEST_BROKER_WITH_URL,
      first_name: 'TestWebhook',
      last_name: 'Broker',
      email: 'webhook-broker@test.com',
      ghl_contact_id: 'test_broker_with_url',
      token: 'test_token_webhook',
      crm_webhook_url: 'https://httpbin.org/post',
    },
    {
      ...baseBroker,
      id: TEST_BROKER_NO_URL,
      first_name: 'TestNoURL',
      last_name: 'Broker',
      email: 'nourl-broker@test.com',
      ghl_contact_id: 'test_broker_no_url',
      token: 'test_token_nourl',
      crm_webhook_url: null,
    },
  ])
  if (brokerErr) throw new Error(`Failed to create test brokers: ${brokerErr.message}`)

  // Create orders: one for each broker
  const { error: orderErr } = await sb.from('orders').insert([
    {
      id: TEST_ORDER_WITH_URL,
      broker_id: TEST_BROKER_WITH_URL,
      total_leads: 10,
      leads_remaining: 10,
      verticals: ['MCA'],
      credit_score_min: 600,
      status: 'active',
      bonus_mode: false,
    },
    {
      id: TEST_ORDER_NO_URL,
      broker_id: TEST_BROKER_NO_URL,
      total_leads: 10,
      leads_remaining: 10,
      verticals: ['SBA'],
      credit_score_min: 600,
      status: 'active',
      bonus_mode: false,
    },
  ])
  if (orderErr) throw new Error(`Failed to create test orders: ${orderErr.message}`)
}

// =====================================================================
// Test 1: Delivery record created on assignment (broker has webhook URL)
// =====================================================================
async function test1_deliveryCreatedOnAssignment() {
  console.log('\nTest 1: Delivery record created on assignment')

  // Insert a lead directly and assign it
  const { error: leadErr } = await sb.from('leads').insert({
    id: TEST_LEAD_1,
    first_name: 'DeliveryTest',
    last_name: 'Lead',
    email: 'delivery@test.com',
    phone: '5551234567',
    vertical: 'MCA',
    credit_score: 700,
    funding_amount: 50000,
    business_name: 'Test Business LLC',
    ghl_contact_id: 'test_delivery_001',
    status: 'pending',
  })
  if (leadErr) throw new Error(`Failed to create test lead: ${leadErr.message}`)

  // Call assign_lead() which should create a webhook_delivery record
  const { data: assignment, error: assignErr } = await sb.rpc('assign_lead', {
    p_lead_id: TEST_LEAD_1,
  })
  if (assignErr) throw new Error(`Assignment failed: ${assignErr.message}`)

  assert('assignment status is assigned', assignment.status === 'assigned', 'assigned', assignment.status)
  assert(
    'assigned to webhook broker',
    assignment.broker_id === TEST_BROKER_WITH_URL,
    TEST_BROKER_WITH_URL,
    assignment.broker_id
  )
  assert('delivery_id is present', !!assignment.delivery_id, 'truthy', String(assignment.delivery_id))

  // Wait a moment for the trigger to fire
  await new Promise((r) => setTimeout(r, 1500))

  // Query deliveries for this lead
  const { data: deliveries, error: delErr } = await sb
    .from('deliveries')
    .select('*')
    .eq('lead_id', TEST_LEAD_1)

  if (delErr) throw new Error(`Failed to query deliveries: ${delErr.message}`)

  assert('delivery record exists', (deliveries?.length ?? 0) > 0, '>=1', String(deliveries?.length))

  const delivery = deliveries![0]
  assert(
    'target_url matches broker webhook',
    delivery.target_url === 'https://httpbin.org/post',
    'https://httpbin.org/post',
    delivery.target_url
  )
  assert(
    'status is sent (trigger fired)',
    delivery.status === 'sent',
    'sent',
    delivery.status
  )
  assert(
    'pg_net_request_id is set',
    delivery.pg_net_request_id !== null,
    'not null',
    String(delivery.pg_net_request_id)
  )
}

// =====================================================================
// Test 2: Delivery payload contains required fields
// =====================================================================
async function test2_payloadContainsRequiredFields() {
  console.log('\nTest 2: Delivery payload contains required fields')

  const { data: deliveries } = await sb
    .from('deliveries')
    .select('payload')
    .eq('lead_id', TEST_LEAD_1)

  assert('delivery exists for payload check', (deliveries?.length ?? 0) > 0, '>=1', String(deliveries?.length))

  const payload = deliveries![0].payload as Record<string, unknown>

  // Required fields in the payload (from assign_lead's jsonb_build_object)
  assert('payload has lead_id', payload.lead_id === TEST_LEAD_1, TEST_LEAD_1, String(payload.lead_id))
  assert('payload has first_name', payload.first_name === 'DeliveryTest', 'DeliveryTest', String(payload.first_name))
  assert('payload has last_name', payload.last_name === 'Lead', 'Lead', String(payload.last_name))
  assert('payload has email', payload.email === 'delivery@test.com', 'delivery@test.com', String(payload.email))
  assert('payload has phone', payload.phone === '5551234567', '5551234567', String(payload.phone))
  assert('payload has vertical', payload.vertical === 'MCA', 'MCA', String(payload.vertical))
  assert('payload has credit_score', payload.credit_score === 700, '700', String(payload.credit_score))
  assert('payload has ghl_contact_id', payload.ghl_contact_id === 'test_delivery_001', 'test_delivery_001', String(payload.ghl_contact_id))
  assert('payload has broker_id', payload.broker_id === TEST_BROKER_WITH_URL, TEST_BROKER_WITH_URL, String(payload.broker_id))
  assert('payload has order_id', payload.order_id === TEST_ORDER_WITH_URL, TEST_ORDER_WITH_URL, String(payload.order_id))
}

// =====================================================================
// Test 3: No delivery when broker has no webhook URL
// =====================================================================
async function test3_noDeliveryWithoutWebhookUrl() {
  console.log('\nTest 3: No delivery when broker has no webhook URL')

  // Create a lead that matches the no-URL broker's order (SBA vertical)
  const { error: leadErr } = await sb.from('leads').insert({
    id: TEST_LEAD_2,
    first_name: 'NoURLTest',
    last_name: 'Lead',
    email: 'nourl@test.com',
    vertical: 'SBA',
    credit_score: 700,
    ghl_contact_id: 'test_delivery_nourl',
    status: 'pending',
  })
  if (leadErr) throw new Error(`Failed to create test lead 2: ${leadErr.message}`)

  // Assign the lead
  const { data: assignment, error: assignErr } = await sb.rpc('assign_lead', {
    p_lead_id: TEST_LEAD_2,
  })
  if (assignErr) throw new Error(`Assignment failed: ${assignErr.message}`)

  assert('assignment status is assigned', assignment.status === 'assigned', 'assigned', assignment.status)
  assert(
    'assigned to no-URL broker',
    assignment.broker_id === TEST_BROKER_NO_URL,
    TEST_BROKER_NO_URL,
    assignment.broker_id
  )
  assert(
    'delivery_id is null (no webhook URL)',
    assignment.delivery_id === null,
    'null',
    String(assignment.delivery_id)
  )

  // Verify no delivery record exists
  const { data: deliveries } = await sb
    .from('deliveries')
    .select('id')
    .eq('lead_id', TEST_LEAD_2)

  assert(
    'no delivery record created',
    (deliveries?.length ?? 0) === 0,
    '0',
    String(deliveries?.length)
  )
}

// =====================================================================
// Test 4: Delivery status tracking columns
// =====================================================================
async function test4_deliveryStatusColumns() {
  console.log('\nTest 4: Delivery status tracking columns')

  const { data: deliveries } = await sb
    .from('deliveries')
    .select('*')
    .eq('lead_id', TEST_LEAD_1)

  assert('delivery exists', (deliveries?.length ?? 0) > 0, '>=1', String(deliveries?.length))

  const d = deliveries![0]

  assert('created_at is set', d.created_at !== null, 'not null', String(d.created_at))
  assert('retry_count is 0', d.retry_count === 0, '0', String(d.retry_count))
  assert(
    'status is valid',
    ['pending', 'sent', 'failed', 'retrying', 'failed_permanent'].includes(d.status),
    'one of: pending|sent|failed|retrying|failed_permanent',
    d.status
  )
  assert('sent_at is set (trigger fired)', d.sent_at !== null, 'not null', String(d.sent_at))
  assert('broker_id is correct', d.broker_id === TEST_BROKER_WITH_URL, TEST_BROKER_WITH_URL, d.broker_id)
  assert('order_id is correct', d.order_id === TEST_ORDER_WITH_URL, TEST_ORDER_WITH_URL, d.order_id)
}

// =====================================================================
// Test 5: Response checker and retry functions exist and execute
// =====================================================================
async function test5_retryFunctionsWork() {
  console.log('\nTest 5: Retry pipeline functions execute without error')

  const { error: checkErr } = await sb.rpc('check_delivery_responses')
  assert('check_delivery_responses() executes', !checkErr, 'no error', checkErr?.message ?? 'OK')

  const { error: retryErr } = await sb.rpc('process_webhook_retries', { p_batch_size: 10 })
  assert('process_webhook_retries(10) executes', !retryErr, 'no error', retryErr?.message ?? 'OK')
}

// =====================================================================
// Run all tests
// =====================================================================
async function main() {
  console.log('=== Webhook Delivery Pipeline Test Suite ===')
  console.log(`Target: ${SUPABASE_URL}`)
  console.log('')

  // Clean up any leftover test data
  await cleanup()

  try {
    await seedTestData()
    await test1_deliveryCreatedOnAssignment()
    await test2_payloadContainsRequiredFields()
    await test3_noDeliveryWithoutWebhookUrl()
    await test4_deliveryStatusColumns()
    await test5_retryFunctionsWork()
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
