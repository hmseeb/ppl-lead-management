# Smart Lead Routing — Developer Specification

| | |
| :---- | :---- |
| Version | 1.0 |
| Audience | **Backend Developer** |
| Domain | **Business Funding** |

## 1. Overview

This document defines the complete logic, data model, and API design for a smart lead routing engine serving a business funding pay-per-lead operation. The system receives inbound leads, scores all eligible brokers, and assigns each lead to the highest-scoring broker — automatically, in real time, with no human intervention.

> **Key constraint:** State/geography is not a routing factor. All clients operate nationwide. Routing decisions are based entirely on credit tier, lead volume caps, loan type, and broker priority.

### 1.1 System Goals

- Distribute leads evenly across brokers relative to their volume targets
- Never send a lead to a broker whose credit minimum the lead does not meet
- Never exceed a broker's lead cap
- Route harder-to-fill 680+ leads to appropriate brokers first
- Produce a full audit trail: every lead, every routing decision, every reason

### 1.2 Participants

| Role | Who | Description |
| :---- | :---- | :---- |
| Lead source | Your intake form / API | Submits inbound lead data to the routing engine |
| Routing engine | This system (to be built) | Scores brokers, assigns lead, logs outcome |
| Broker (client) | Up to N active clients | Receives assigned leads up to their cap |
| Admin | You / ops team | Manages broker profiles, caps, and priorities |

## 2. Data Model

### 2.1 Broker Profile

Each broker is a row in a brokers table. Fields marked * are required.

| Field | Type | Example | Description |
| :---- | :---- | :---- | :---- |
| id * | UUID | uuid-001 | Primary key |
| name * | string | Apex Lending | Display name |
| credit_min * | integer | 680 | Minimum credit score. Only accepts 600 or 680. |
| lead_target * | integer | 100 | Monthly lead cap (e.g. 10 or 100) |
| leads_filled | integer | 38 | Leads assigned this period. Resets monthly. |
| priority | enum | high / normal | High gets a scoring bonus. Default: normal. |
| loan_min | integer | 100000 | Minimum loan amount ($) they serve |
| loan_max | integer | 1500000 | Maximum loan amount ($) they serve |
| active | boolean | true | False = pause routing without deleting broker |
| webhook_url | string | https://... | POST endpoint to deliver the assigned lead |
| created_at | timestamp | 2025-01-01 | ISO 8601 |

### 2.2 Lead Record

| Field | Type | Example | Description |
| :---- | :---- | :---- | :---- |
| id * | UUID | uuid-lead-01 | Primary key |
| credit_score * | integer | 640 | Applicant credit score (300–850) |
| loan_amount * | integer | 250000 | Requested funding amount ($) |
| loan_type | enum | purchase / refi / cashout | Type of business funding requested |
| business_name | string | Acme LLC | Applicant business name |
| contact_email | string | owner@acme.com | Primary contact email |
| contact_phone | string | +1-555-000-0000 | Primary contact phone |
| assigned_broker_id | UUID / null | uuid-001 | Set after routing. Null if unrouted. |
| routing_score | float | 74.5 | Score of winning broker at assignment time |
| status | enum | pending / routed / unrouted / rejected | Lifecycle state |
| routed_at | timestamp | 2025-03-13T10:00:00Z | ISO 8601 timestamp of assignment |
| created_at | timestamp | 2025-03-13T09:59:00Z | Submission timestamp |

### 2.3 Routing Log

Every routing attempt — for every broker considered, not just the winner — must be logged. This is critical for debugging and dispute resolution.

| Field | Type | Description |
| :---- | :---- | :---- |
| id | UUID | Log entry primary key |
| lead_id | UUID | Foreign key to leads table |
| broker_id | UUID | Broker considered for this lead |
| eligible | boolean | Did this broker pass all hard filters? |
| disqualify_reason | string / null | If not eligible: 'cap_reached', 'credit_below_min', 'loan_out_of_range' |
| score_breakdown | JSON | `{ credit_fit: 32, capacity: 18, tier_match: 20, loan_fit: 10, priority_bonus: 8, total: 88 }` |
| selected | boolean | True only for the winning broker |
| created_at | timestamp | ISO 8601 |

## 3. Routing Algorithm

The algorithm runs synchronously on every lead submission. It must complete in under 200ms. The steps below define the exact logic to implement.

### Step 1 — Pre-flight checks (reject immediately)

> **Before scoring:** These checks happen before the broker loop. If a lead fails pre-flight, it is marked 'rejected' and no broker scores are computed.

- credit_score < 600 → reject lead, status = 'rejected', reason = 'credit_too_low'
- loan_amount is missing or <= 0 → reject, reason = 'invalid_loan_amount'
- No active brokers in the system → reject, reason = 'no_active_brokers'

### Step 2 — Hard filters per broker

For each active broker, check all of the following. If any fail, the broker is excluded and logged with eligible = false.

- broker.active = false → skip (do not even log)
- broker.leads_filled >= broker.lead_target → disqualify: 'cap_reached'
- lead.credit_score < broker.credit_min → disqualify: 'credit_below_min'
- lead.loan_amount < broker.loan_min OR lead.loan_amount > broker.loan_max → disqualify: 'loan_out_of_range'

> **Credit tier gate:** A broker with credit_min = 680 must NEVER receive a lead with credit_score < 680. A broker with credit_min = 600 may receive any lead scoring 600 or above, including 680+ leads.

### Step 3 — Score each eligible broker (0–100 points)

Score = Credit Fit + Capacity + Tier Match + Loan Fit + Bonuses

#### 3a. Credit Fit (max 40 points)

Rewards brokers who are a stronger match for this lead's credit level.

```
credit_fit = (lead.credit_score - broker.credit_min) / (850 - broker.credit_min) * 40

Example: lead score 720, broker min 680
  = (720 - 680) / (850 - 680) * 40
  = 40 / 170 * 40
  = 9.4 pts
```

#### 3b. Capacity (max 30 points)

Brokers with more remaining capacity score higher. This ensures even distribution — leads flow toward emptier brokers before fuller ones.

```
fill_rate = broker.leads_filled / broker.lead_target
capacity  = (1 - fill_rate) * 30

Example: 22 filled of 100 target
  = (1 - 0.22) * 30 = 23.4 pts

Example: 90 filled of 100 target
  = (1 - 0.90) * 30 = 3.0 pts
```

#### 3c. Tier Match (max 20 points)

Rewards exact credit tier alignment. This keeps 680-tier brokers focused on higher-quality leads.

| Lead credit score | Broker credit_min | Tier match points |
| :---- | :---- | :---- |
| 680 – 850 | 680 | 20 pts (exact match) |
| 600 – 679 | 600 | 20 pts (exact match) |
| 680 – 850 | 600 | 10 pts (fallback — 600-tier can accept 680+ lead) |
| < 600 | any | Lead rejected in Step 1 — never reaches here |

#### 3d. Loan Fit (max 10 points)

Binary check: does the loan amount fall within the broker's preferred range?

```
if loan_amount >= broker.loan_min AND loan_amount <= broker.loan_max:
    loan_fit = 10
else:
    loan_fit = 0   // broker already excluded in Step 2, but kept for future partial-match logic
```

#### 3e. Bonuses and Penalties

| Condition | Adjustment | Reason |
| :---- | :---- | :---- |
| broker.priority = 'high' | +8 pts | Preferred clients get a consistent boost |
| fill_rate > 0.80 (above 80% full) | +5 pts | Urgency bonus — help this broker reach their cap |
| fill_rate < 0.10 (under 10% full) | -5 pts | Deprioritize if barely started — spread load elsewhere first |

### Step 4 — Select and assign

- Sort all eligible (scored) brokers descending by total score
- Winner = top broker. In a tie, winner = lowest fill_rate (most capacity remaining)
- Increment winner's leads_filled by 1 (atomic update — use a DB transaction or optimistic locking)
- Set lead.assigned_broker_id = winner.id, lead.status = 'routed', lead.routing_score = winner.score, lead.routed_at = now()
- If zero brokers passed the hard filters: lead.status = 'unrouted' → add to manual review queue
- Write routing log rows for every broker considered (winner and non-winners)
- POST lead payload to winner.webhook_url (see Section 5)

> **Atomic increment:** leads_filled must be incremented atomically to prevent race conditions when two leads arrive simultaneously. Use a database-level `UPDATE brokers SET leads_filled = leads_filled + 1 WHERE id = ?` and confirmed row count = 1 before marking the lead as routed.

## 4. Credit Tier Routing Rules

These are the non-negotiable business rules that override scoring when in conflict.

| Lead credit range | Primary target | Fallback if no primary available |
| :---- | :---- | :---- |
| 680 – 850 | Brokers with credit_min = 680 | Brokers with credit_min = 600 (scores 10 tier pts instead of 20) |
| 600 – 679 | Brokers with credit_min = 600 only | None — never route to 680-tier brokers |
| < 600 | Rejected in pre-flight | N/A |

> **Why this matters:** Brokers who pay for 680+ leads have agreed to higher-quality acquisition costs. Sending them a 640-score lead violates their contract. The hard filter in Step 2 enforces this automatically — the scoring tier adjustment in Step 3c simply ensures the right brokers win first when multiple are eligible.

## 5. Volume Balancing

Volume balancing is automatic — it is built into the scoring algorithm, not a separate system. Here is how it works in practice:

- A broker at 10% fill (10/100 leads) scores ~27 capacity points
- A broker at 80% fill (80/100 leads) scores ~6 capacity points
- This 21-point gap naturally directs leads toward the emptier broker
- As the emptier broker fills, the gap closes and load spreads evenly
- The urgency bonus (+5 pts at >80% fill) prevents a broker from stalling out just before their cap

> **No manual queue management needed:** Because remaining capacity is 30% of the total score, the algorithm self-balances across all active brokers without any cron jobs, round-robin logic, or manual intervention. Just keep leads_filled accurate and the math does the rest.

### 5.1 Monthly Cap Reset

- On the 1st of each month at 00:00 UTC, set leads_filled = 0 for all brokers
- Log the reset event in an audit table (broker_id, reset_at, previous_filled_count)
- Do not reset mid-month under any circumstances — this would corrupt the balancing math

## 6. API Design

### 6.1 Submit a Lead

```
POST /api/v1/leads
```

**Request body:**

```json
{
  "credit_score": 640,
  "loan_amount": 250000,
  "loan_type": "purchase",
  "business_name": "Acme LLC",
  "contact_email": "owner@acme.com",
  "contact_phone": "+1-555-000-0000"
}
```

**Response 200 — routed:**

```json
{
  "lead_id": "uuid-lead-01",
  "status": "routed",
  "assigned_broker": { "id": "uuid-001", "name": "Apex Lending" },
  "routing_score": 74.5,
  "routed_at": "2025-03-13T10:00:00Z"
}
```

**Response 200 — unrouted (no eligible broker):**

```json
{
  "lead_id": "uuid-lead-02",
  "status": "unrouted",
  "reason": "no_eligible_broker"
}
```

**Response 422 — rejected (pre-flight fail):**

```json
{
  "status": "rejected",
  "reason": "credit_too_low",
  "detail": "Credit score 540 is below the minimum of 600"
}
```

### 6.2 Broker Webhook Delivery

When a lead is assigned, the engine POSTs the following payload to broker.webhook_url within 5 seconds of assignment. Include retry logic: 3 attempts with exponential backoff (1s, 4s, 16s). If all attempts fail, mark lead as 'delivery_failed' and alert ops.

```
POST {broker.webhook_url}
Content-Type: application/json
X-PPL-Signature: HMAC-SHA256 of body using broker's webhook_secret
```

```json
{
  "event": "lead.assigned",
  "lead": {
    "id": "uuid-lead-01",
    "credit_score": 640,
    "loan_amount": 250000,
    "loan_type": "purchase",
    "business_name": "Acme LLC",
    "contact_email": "owner@acme.com",
    "contact_phone": "+1-555-000-0000",
    "routed_at": "2025-03-13T10:00:00Z"
  }
}
```

### 6.3 Admin Endpoints

| Method | Path | Description |
| :---- | :---- | :---- |
| GET | /api/v1/brokers | List all brokers with current fill rates |
| POST | /api/v1/brokers | Create a new broker profile |
| PATCH | /api/v1/brokers/:id | Update broker fields (cap, priority, active, etc.) |
| DELETE | /api/v1/brokers/:id | Soft delete — sets active = false |
| GET | /api/v1/leads | List leads with filters (status, date range, broker) |
| GET | /api/v1/leads/:id/routing-log | Full scoring breakdown for a specific lead |
| GET | /api/v1/dashboard | Aggregate: fills, caps, unrouted count, top brokers |

## 7. Edge Cases & Handling

| Scenario | Correct behavior |
| :---- | :---- |
| All brokers at cap | Lead → 'unrouted'. Alert ops. Do not force-assign over cap. |
| No 680-tier broker eligible for 680+ lead | Fall through to 600-tier brokers (10 tier pts, not 20). If still none, unrouted. |
| 600–679 lead, only 680-tier brokers active | All excluded in hard filter. Lead → 'unrouted'. |
| Duplicate lead submission (same email + phone) | Deduplicate: return existing lead_id with status. Do not re-route. |
| Broker webhook fails after 3 retries | Mark lead 'delivery_failed'. Alert ops. Do NOT re-assign — broker's cap is still incremented. |
| Concurrent leads hitting same broker | Atomic DB increment. If optimistic lock fails, re-run routing for that lead from Step 2. |
| Broker paused mid-month (active = false) | Immediately stop routing to them. leads_filled is preserved — resume later without resetting. |
| Loan amount exactly at broker min or max | Inclusive: loan_amount >= loan_min AND loan_amount <= loan_max both pass. |

## 8. Rollout Checklist

- [ ] Seed all 10 broker profiles with correct credit_min, lead_target, loan_min, loan_max, priority, and webhook_url
- [ ] Test: submit a 640-score lead → confirm it only routes to 600-tier brokers
- [ ] Test: submit a 720-score lead → confirm it routes to 680-tier first, falls to 600-tier only if none eligible
- [ ] Test: fill a broker to cap → confirm next lead skips them
- [ ] Test: concurrent lead submission → confirm no broker exceeds their cap
- [ ] Test: webhook delivery failure → confirm retry logic and 'delivery_failed' status
- [ ] Verify routing_logs table has a row per broker considered for each lead
- [ ] Set up monthly cap reset job with audit logging
- [ ] Enable alerts: 90% fill threshold, unrouted spike

> **Ready to build:** This spec is complete. All business rules, data structures, API contracts, and edge cases are defined. Any questions should be clarified before implementation begins to avoid rework.
