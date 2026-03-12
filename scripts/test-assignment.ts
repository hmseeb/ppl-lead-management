/**
 * Test script for assign_lead() Postgres function.
 * Runs 8 test scenarios against the live Supabase database.
 *
 * Usage: bunx tsx scripts/test-assignment.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kovcroqqudozpaocpeks.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdmNyb3FxdWRvenBhb2NwZWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzMzM4OCwiZXhwIjoyMDg4ODA5Mzg4fQ.0qw5COcvqsa3xshZJpOztpLThnKoNtDUBnAL_gnO_jk'

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Broker IDs (existing in DB)
const BROKER_1 = '9e2ec712-e174-499f-b5ed-dab357e5c23a' // Sarah Williams
const BROKER_2 = '43db37ae-36e9-496d-9530-a095e5c9def3' // Mike Ross
const BROKER_3 = '95bd4a66-fa58-41e0-a00f-b943d9271d65' // Jake Rivera

// Fixed UUIDs for test data
const ORDER_A = 'aaaaaaaa-0001-4000-8000-000000000001'
const ORDER_B = 'aaaaaaaa-0002-4000-8000-000000000002'
const ORDER_C = 'aaaaaaaa-0003-4000-8000-000000000003'

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
  // Delete in FK-safe order
  await sb.from('unassigned_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await sb.from('activity_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await sb.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await sb.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

async function seedBaseData() {
  // Orders
  await sb.from('orders').insert([
    {
      id: ORDER_A,
      broker_id: BROKER_1,
      total_leads: 10,
      leads_remaining: 10,
      verticals: ['MCA', 'SBA'],
      credit_score_min: 620,
      status: 'active',
      bonus_mode: false,
    },
    {
      id: ORDER_B,
      broker_id: BROKER_2,
      total_leads: 5,
      leads_remaining: 5,
      verticals: ['All'],
      credit_score_min: null,
      status: 'active',
      bonus_mode: false,
    },
    {
      id: ORDER_C,
      broker_id: BROKER_3,
      total_leads: 3,
      leads_remaining: 3,
      verticals: ['Equipment Finance'],
      credit_score_min: 700,
      status: 'active',
      bonus_mode: false,
    },
  ])
}

async function createLead(
  id: string,
  firstName: string,
  vertical: string,
  creditScore: number
): Promise<string> {
  const { error } = await sb.from('leads').insert({
    id,
    first_name: firstName,
    last_name: 'Test',
    email: `${firstName.toLowerCase()}@test.com`,
    vertical,
    credit_score: creditScore,
    status: 'pending',
  })
  if (error) throw new Error(`Failed to create lead: ${error.message}`)
  return id
}

async function callAssignLead(leadId: string): Promise<any> {
  const { data, error } = await sb.rpc('assign_lead', { p_lead_id: leadId })
  if (error) throw new Error(`RPC error: ${error.message}`)
  return data
}

// =====================================================================
// Test 1: Basic assignment
// =====================================================================
async function test1_basicAssignment() {
  console.log('\nTest 1: Basic assignment')
  await cleanup()
  await seedBaseData()

  const leadId = await createLead(
    'bbbbbbbb-0001-4000-8000-000000000001',
    'Alice',
    'MCA',
    680
  )

  const result = await callAssignLead(leadId)

  assert('status is assigned', result.status === 'assigned', 'assigned', result.status)
  // MCA 680: matches Order A (MCA, min 620, 10/10 remaining = 1.0 ratio)
  // and Order B (All, no min, 5/5 remaining = 1.0 ratio)
  // Tiebreak: last_assigned_at ASC NULLS FIRST. Both are null, so whichever Postgres picks.
  // Both have ratio 1.0, both have null last_assigned_at. Order A or B is valid.
  assert(
    'assigned to a valid broker',
    result.broker_id === BROKER_1 || result.broker_id === BROKER_2,
    `${BROKER_1} or ${BROKER_2}`,
    result.broker_id
  )

  // Check lead is updated
  const { data: lead } = await sb.from('leads').select('status, assigned_broker_id').eq('id', leadId).single()
  assert('lead status is assigned', lead?.status === 'assigned', 'assigned', lead?.status ?? 'null')
  assert('lead has assigned_broker_id', !!lead?.assigned_broker_id, 'truthy', String(lead?.assigned_broker_id))

  // Check activity log
  const { data: logs } = await sb
    .from('activity_log')
    .select('event_type')
    .eq('lead_id', leadId)
    .eq('event_type', 'lead_assigned')
  assert('activity_log has lead_assigned entry', (logs?.length ?? 0) > 0, '>=1', String(logs?.length))
}

// =====================================================================
// Test 2: Weighted rotation distributes correctly
// =====================================================================
async function test2_weightedRotation() {
  console.log('\nTest 2: Weighted rotation')
  await cleanup()
  await seedBaseData()

  // Create 4 MCA leads with high enough credit scores for both A and B
  const leads: string[] = []
  for (let i = 1; i <= 4; i++) {
    const id = `cccccccc-0002-4000-8000-00000000000${i}`
    await createLead(id, `Rotation${i}`, 'MCA', 700)
    leads.push(id)
  }

  const results = []
  for (const lid of leads) {
    const r = await callAssignLead(lid)
    results.push(r)
  }

  const broker1Count = results.filter((r) => r.broker_id === BROKER_1).length
  const broker2Count = results.filter((r) => r.broker_id === BROKER_2).length

  // Order A: 10/10 = 1.0 ratio, Order B: 5/5 = 1.0 ratio
  // After first assignment, the winner drops. With 4 leads, both should get some.
  assert(
    'both brokers received leads',
    broker1Count > 0 && broker2Count > 0,
    'both > 0',
    `broker1=${broker1Count}, broker2=${broker2Count}`
  )

  // Order A (10 total) should get proportionally more than Order B (5 total)
  // because after each assignment, A's ratio stays higher.
  // After assign to A: A=9/10=0.9, B=5/5=1.0 -> B wins next
  // After assign to B: A=9/10=0.9, B=4/5=0.8 -> A wins next
  // After assign to A: A=8/10=0.8, B=4/5=0.8 -> tiebreak by last_assigned_at, A was more recent so B
  // After assign to B: done
  // Expected: A=2, B=2 roughly
  assert(
    'distribution is reasonable',
    broker1Count >= 1 && broker2Count >= 1,
    'each >= 1',
    `broker1=${broker1Count}, broker2=${broker2Count}`
  )
}

// =====================================================================
// Test 3: Unmatched lead goes to unassigned_queue
// =====================================================================
async function test3_unmatchedLead() {
  console.log('\nTest 3: Unmatched lead')
  await cleanup()

  // Seed only orders with specific verticals (no "All" catch-all)
  await sb.from('orders').insert([
    {
      id: ORDER_A,
      broker_id: BROKER_1,
      total_leads: 10,
      leads_remaining: 10,
      verticals: ['MCA', 'SBA'],
      credit_score_min: 620,
      status: 'active',
      bonus_mode: false,
    },
    {
      id: ORDER_C,
      broker_id: BROKER_3,
      total_leads: 3,
      leads_remaining: 3,
      verticals: ['Equipment Finance'],
      credit_score_min: 700,
      status: 'active',
      bonus_mode: false,
    },
  ])

  // Residential Mortgage has no matching orders (no "All" order either)
  const leadId = await createLead(
    'bbbbbbbb-0003-4000-8000-000000000001',
    'Unmatched',
    'Residential Mortgage',
    750
  )

  const result = await callAssignLead(leadId)
  assert('status is unassigned', result.status === 'unassigned', 'unassigned', result.status)
  assert('reason mentions vertical', result.reason?.includes('Residential Mortgage'), 'contains vertical', result.reason)

  // Check unassigned_queue
  const { data: queue } = await sb
    .from('unassigned_queue')
    .select('lead_id, reason, details')
    .eq('lead_id', leadId)
  assert('unassigned_queue has entry', (queue?.length ?? 0) > 0, '>=1', String(queue?.length))

  // Check activity_log
  const { data: logs } = await sb
    .from('activity_log')
    .select('event_type')
    .eq('lead_id', leadId)
    .eq('event_type', 'lead_unassigned')
  assert('activity_log has lead_unassigned entry', (logs?.length ?? 0) > 0, '>=1', String(logs?.length))
}

// =====================================================================
// Test 4: Credit score filter
// =====================================================================
async function test4_creditScoreFilter() {
  console.log('\nTest 4: Credit score filter')
  await cleanup()
  await seedBaseData()

  // SBA, credit 550: too low for Order A (min 620), should go to Order B (All, no min)
  const leadId = await createLead(
    'bbbbbbbb-0004-4000-8000-000000000001',
    'LowCredit',
    'SBA',
    550
  )

  const result = await callAssignLead(leadId)
  assert('status is assigned', result.status === 'assigned', 'assigned', result.status)
  assert('assigned to broker 2 (Order B)', result.broker_id === BROKER_2, BROKER_2, result.broker_id)
  assert('assigned to Order B', result.order_id === ORDER_B, ORDER_B, result.order_id)
}

// =====================================================================
// Test 5: Bonus mode (no decrement, assignment past 0)
// =====================================================================
async function test5_bonusMode() {
  console.log('\nTest 5: Bonus mode')
  await cleanup()
  await seedBaseData()

  // Set Order B to bonus_mode=true and leads_remaining=0
  await sb
    .from('orders')
    .update({ bonus_mode: true, leads_remaining: 0 })
    .eq('id', ORDER_B)

  // Working Capital only matches Order B (All vertical)
  const leadId = await createLead(
    'bbbbbbbb-0005-4000-8000-000000000001',
    'BonusLead',
    'Working Capital',
    750
  )

  const result = await callAssignLead(leadId)
  assert('status is assigned', result.status === 'assigned', 'assigned', result.status)
  assert('assigned to broker 2 (bonus Order B)', result.broker_id === BROKER_2, BROKER_2, result.broker_id)

  // Check leads_remaining stayed at 0
  const { data: order } = await sb.from('orders').select('leads_remaining, status').eq('id', ORDER_B).single()
  assert('leads_remaining still 0', order?.leads_remaining === 0, '0', String(order?.leads_remaining))
  assert('order still active (bonus mode)', order?.status === 'active', 'active', order?.status ?? 'null')
}

// =====================================================================
// Test 6: Auto-complete when leads_remaining hits 0
// =====================================================================
async function test6_autoComplete() {
  console.log('\nTest 6: Auto-complete')
  await cleanup()
  await seedBaseData()

  // Set Order C to 1 remaining, bonus_mode=false
  await sb
    .from('orders')
    .update({ leads_remaining: 1, bonus_mode: false })
    .eq('id', ORDER_C)

  // Equipment Finance, 720 >= 700
  const leadId = await createLead(
    'bbbbbbbb-0006-4000-8000-000000000001',
    'LastLead',
    'Equipment Finance',
    720
  )

  const result = await callAssignLead(leadId)
  assert('status is assigned', result.status === 'assigned', 'assigned', result.status)

  // Could go to Order B (All, 5/5) or Order C (EF, 1/3)
  // Order B ratio: 5/5 = 1.0, Order C ratio: 1/3 = 0.33
  // Order B wins on ratio. But let me check...
  // Actually we want to test auto-complete specifically on Order C.
  // Let me set Order B to something that won't match by pausing it.
  // Hmm, let me restructure: pause Order A and B so only C is active.

  // Redo: cleanup and re-seed with only Order C active
  await cleanup()

  // Insert only Order C
  await sb.from('orders').insert({
    id: ORDER_C,
    broker_id: BROKER_3,
    total_leads: 3,
    leads_remaining: 1,
    verticals: ['Equipment Finance'],
    credit_score_min: 700,
    status: 'active',
    bonus_mode: false,
  })

  const leadId2 = await createLead(
    'bbbbbbbb-0006-4000-8000-000000000002',
    'LastLead2',
    'Equipment Finance',
    720
  )

  const result2 = await callAssignLead(leadId2)
  assert('status is assigned', result2.status === 'assigned', 'assigned', result2.status)
  assert('assigned to Order C', result2.order_id === ORDER_C, ORDER_C, result2.order_id)

  // Check order is now completed
  const { data: order } = await sb.from('orders').select('leads_remaining, status').eq('id', ORDER_C).single()
  assert('leads_remaining is 0', order?.leads_remaining === 0, '0', String(order?.leads_remaining))
  assert('order status is completed', order?.status === 'completed', 'completed', order?.status ?? 'null')
}

// =====================================================================
// Test 7: Paused order is skipped
// =====================================================================
async function test7_pausedOrderSkip() {
  console.log('\nTest 7: Paused order skip')
  await cleanup()
  await seedBaseData()

  // Pause Order A
  await sb.from('orders').update({ status: 'paused' }).eq('id', ORDER_A)

  // MCA, credit 680: normally matches A and B, but A is paused
  const leadId = await createLead(
    'bbbbbbbb-0007-4000-8000-000000000001',
    'PausedTest',
    'MCA',
    680
  )

  const result = await callAssignLead(leadId)
  assert('status is assigned', result.status === 'assigned', 'assigned', result.status)
  assert('assigned to broker 2 (Order B), not paused broker 1', result.broker_id === BROKER_2, BROKER_2, result.broker_id)
}

// =====================================================================
// Test 8: Paused broker is skipped
// =====================================================================
async function test8_pausedBrokerSkip() {
  console.log('\nTest 8: Paused broker skip')
  await cleanup()
  await seedBaseData()

  // Pause Broker 1's assignment_status
  await sb
    .from('brokers')
    .update({ assignment_status: 'paused' })
    .eq('id', BROKER_1)

  // MCA, credit 680: Order A's broker is paused, should skip to Order B
  const leadId = await createLead(
    'bbbbbbbb-0008-4000-8000-000000000001',
    'BrokerPaused',
    'MCA',
    680
  )

  const result = await callAssignLead(leadId)
  assert('status is assigned', result.status === 'assigned', 'assigned', result.status)
  assert('assigned to broker 2 (Order B), not paused broker 1', result.broker_id === BROKER_2, BROKER_2, result.broker_id)

  // Restore broker 1 status
  await sb
    .from('brokers')
    .update({ assignment_status: 'active' })
    .eq('id', BROKER_1)
}

// =====================================================================
// Run all tests
// =====================================================================
async function main() {
  console.log('=== assign_lead() Test Suite ===')
  console.log(`Target: ${SUPABASE_URL}`)
  console.log('')

  try {
    await test1_basicAssignment()
    await test2_weightedRotation()
    await test3_unmatchedLead()
    await test4_creditScoreFilter()
    await test5_bonusMode()
    await test6_autoComplete()
    await test7_pausedOrderSkip()
    await test8_pausedBrokerSkip()
  } catch (err) {
    console.error('\nFATAL ERROR:', err)
    failed++
  }

  // Final cleanup
  await cleanup()

  // Restore any broker state changes
  await sb
    .from('brokers')
    .update({ assignment_status: 'active' })
    .eq('id', BROKER_1)

  console.log('\n=== Results ===')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(failed === 0 ? '\nALL TESTS PASSED' : '\nSOME TESTS FAILED')
  process.exit(failed > 0 ? 1 : 0)
}

main()
