# Architecture Research

**Domain:** Lead Distribution & Round-Robin Management System
**Researched:** 2026-03-12
**Confidence:** HIGH

## System Overview

```
                         EXTERNAL
    ┌──────────────────────────────────────────────┐
    │  GHL Main Account                             │
    │  (webhook source)                             │
    └──────────────┬───────────────────────────────┘
                   │ POST /api/webhooks/inbound
                   v
    ┌──────────────────────────────────────────────┐
    │              INGESTION LAYER                  │
    │  ┌────────────────┐  ┌─────────────────────┐ │
    │  │ Inbound Webhook │  │ Lead Update (PATCH) │ │
    │  │ Route Handler   │  │ Route Handler       │ │
    │  └───────┬────────┘  └────────┬────────────┘ │
    │          │                    │               │
    ├──────────┴────────────────────┴───────────────┤
    │              ASSIGNMENT ENGINE                 │
    │  ┌───────────────────────────────────────────┐│
    │  │  Postgres Function: assign_lead()         ││
    │  │  1. Acquire advisory lock                 ││
    │  │  2. Find matching active orders           ││
    │  │  3. Weighted rotation selection           ││
    │  │  4. Decrement leads_remaining             ││
    │  │  5. Log assignment event                  ││
    │  │  6. Release lock on commit                ││
    │  └───────────────────┬───────────────────────┘│
    │                      │                        │
    ├──────────────────────┴────────────────────────┤
    │              DELIVERY LAYER                    │
    │  ┌─────────────────┐  ┌─────────────────────┐│
    │  │  pg_net          │  │  pg_cron            ││
    │  │  (async outbound │  │  (retry scanner     ││
    │  │   webhook POST)  │  │   every 2 min)      ││
    │  └────────┬────────┘  └──────────┬──────────┘│
    │           │                      │            │
    ├───────────┴──────────────────────┴────────────┤
    │              DATA LAYER (Supabase)             │
    │  ┌─────────┐ ┌────────┐ ┌──────┐ ┌─────────┐│
    │  │ leads   │ │ orders │ │broker│ │ events  ││
    │  └─────────┘ └────────┘ └──────┘ └─────────┘│
    │  ┌───────────────────┐ ┌────────────────────┐│
    │  │ webhook_deliveries│ │ unassigned_queue   ││
    │  └───────────────────┘ └────────────────────┘│
    │          │ (Realtime Broadcast)               │
    ├──────────┴────────────────────────────────────┤
    │              PRESENTATION LAYER                │
    │  ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
    │  │ Dashboard│ │ Leads    │ │ Brokers/Orders│ │
    │  │ Overview │ │ Table    │ │ Management    │ │
    │  └──────────┘ └──────────┘ └───────────────┘ │
    │  ┌──────────────┐ ┌────────────────────────┐ │
    │  │ Unassigned Q │ │ Activity Log           │ │
    │  └──────────────┘ └────────────────────────┘ │
    └──────────────────────────────────────────────┘
                         EXTERNAL
    ┌──────────────────────────────────────────────┐
    │  Broker GHL Sub-Accounts                      │
    │  (each has unique webhook URL)                │
    └──────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Inbound Webhook Handler | Validate, parse, and store incoming leads from GHL | Next.js Route Handler at `app/api/webhooks/inbound/route.ts` |
| Lead Update Handler | Accept PATCH updates (AI call notes) matching on `ghl_contact_id` | Next.js Route Handler at `app/api/webhooks/leads/route.ts` |
| Assignment Engine | Match leads to orders, run weighted rotation, assign atomically | Postgres function `assign_lead()` with advisory locks |
| Delivery Layer (pg_net) | Fire outbound webhook to broker's GHL sub-account | `net.http_post()` called from assignment function or trigger |
| Retry Scanner (pg_cron) | Find failed deliveries, retry up to 3 times | Scheduled Postgres function every 2 minutes |
| Dashboard (Server Components) | Render admin views with SSR, handle mutations via Server Actions | Next.js App Router pages with ShadCN components |
| Realtime Subscription Layer | Push live updates to open dashboard sessions | Supabase Realtime Broadcast via database triggers |
| Auth Guard | Protect all dashboard routes with session cookie | Middleware + simple password check |

## Recommended Project Structure

```
app/
├── (auth)/                    # Auth route group
│   └── login/
│       └── page.tsx           # Password login page
├── (dashboard)/               # Protected admin route group
│   ├── layout.tsx             # Shared dashboard shell, nav, realtime provider
│   ├── page.tsx               # Overview: KPIs + activity feed
│   ├── leads/
│   │   ├── page.tsx           # Leads table with filters
│   │   └── [id]/
│   │       └── page.tsx       # Lead detail + assignment history
│   ├── brokers/
│   │   ├── page.tsx           # Brokers table
│   │   └── [id]/
│   │       └── page.tsx       # Broker profile + lead history
│   ├── orders/
│   │   └── page.tsx           # Orders table with inline actions
│   ├── unassigned/
│   │   └── page.tsx           # Unassigned queue + manual assign
│   └── activity/
│       └── page.tsx           # Full activity log
├── api/
│   └── webhooks/
│       ├── inbound/
│       │   └── route.ts       # GHL inbound lead webhook
│       └── leads/
│           └── route.ts       # Lead update PATCH endpoint
├── layout.tsx                 # Root layout, theme provider
└── middleware.ts              # Auth check, redirect unauthenticated
lib/
├── supabase/
│   ├── client.ts              # Browser Supabase client
│   ├── server.ts              # Server-side Supabase client
│   └── admin.ts               # Service role client (webhooks)
├── assignment/
│   └── assign.ts              # Call the assign_lead() RPC
├── webhooks/
│   ├── validate.ts            # Webhook payload validation + secrets
│   └── deliver.ts             # Outbound delivery helper (if needed from app layer)
├── types/
│   └── database.ts            # Generated Supabase types
└── utils/
    └── format.ts              # Date, currency, status formatters
components/
├── ui/                        # ShadCN primitives
├── leads/                     # Lead-specific components
├── brokers/                   # Broker-specific components
├── orders/                    # Order-specific components
├── dashboard/                 # KPI cards, activity feed, charts
└── realtime/
    └── realtime-provider.tsx  # Supabase Realtime subscription manager
supabase/
├── migrations/                # SQL migrations (schema, functions, triggers)
├── seed.sql                   # Dev seed data
└── config.toml                # Supabase local dev config
```

### Structure Rationale

- **Route groups `(auth)` and `(dashboard)`:** Separate layout needs. Dashboard gets the nav shell and realtime provider. Auth pages are bare. Neither adds URL segments.
- **`api/webhooks/`:** External webhook endpoints use Route Handlers (not Server Actions) because they receive external HTTP requests with custom headers, not React form submissions.
- **`lib/supabase/` with three clients:** Browser client for realtime subscriptions, server client for SSR data fetching with cookie-based auth, admin/service-role client for webhook handlers that bypass RLS.
- **`lib/assignment/`:** Thin wrapper calling the Postgres RPC. The real logic lives in SQL, not TypeScript. This is intentional. The assignment engine must be atomic and fast, which means Postgres, not application code.
- **`supabase/migrations/`:** All schema, functions, triggers, and cron jobs defined as SQL migrations. This is the most critical directory in the project.
- **`components/realtime/`:** Single provider component that manages channel subscriptions and distributes events to child components via React context.

## Architectural Patterns

### Pattern 1: Database-Driven Assignment Engine

**What:** The entire lead matching and assignment logic runs as a single Postgres function (`assign_lead()`), not in application code. The Next.js webhook handler validates the payload, inserts the lead, then calls `SELECT assign_lead(lead_id)` via RPC.

**When to use:** Always. This is the core architectural decision. Lead assignment must be atomic, fast, and race-condition-free. Running it in Postgres with advisory locks gives you all three.

**Trade-offs:**
- PRO: Atomic. No partial state. Advisory lock + single transaction = no race conditions.
- PRO: Fast. No network round-trips between app and DB during assignment.
- PRO: Auditable. Everything logged in the same transaction.
- CON: SQL is harder to debug than TypeScript. Invest in good logging.
- CON: Testing requires a real Postgres instance (Supabase local dev).

**Example:**
```sql
CREATE OR REPLACE FUNCTION assign_lead(p_lead_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_lead record;
  v_order record;
  v_lock_key bigint;
BEGIN
  -- 1. Fetch the lead
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'lead_not_found');
  END IF;

  -- 2. Acquire advisory lock scoped to assignment engine
  -- Use a fixed namespace (1001) + lead vertical hash to reduce contention
  v_lock_key := hashtext(v_lead.vertical);
  PERFORM pg_advisory_xact_lock(1001, v_lock_key);

  -- 3. Find best matching active order (weighted rotation)
  SELECT o.* INTO v_order
  FROM orders o
  JOIN brokers b ON b.id = o.broker_id
  WHERE o.status = 'active'
    AND b.status = 'active'
    AND v_lead.vertical = ANY(o.verticals)
    AND v_lead.credit_score >= o.credit_score_min
  ORDER BY
    -- Weighted: orders with more remaining get proportionally more leads
    (o.leads_remaining::float / GREATEST(o.total_leads, 1)) DESC,
    -- Tiebreaker: least recently assigned
    o.last_assigned_at ASC NULLS FIRST
  LIMIT 1;

  IF NOT FOUND THEN
    -- No matching order: queue as unassigned
    INSERT INTO unassigned_queue (lead_id, reason)
    VALUES (p_lead_id, 'no_matching_active_order');

    INSERT INTO events (type, lead_id, details)
    VALUES ('lead_unassigned', p_lead_id,
      jsonb_build_object('reason', 'no_matching_active_order'));

    RETURN jsonb_build_object('status', 'unassigned', 'reason', 'no_matching_active_order');
  END IF;

  -- 4. Assign the lead
  UPDATE leads SET
    assigned_broker_id = v_order.broker_id,
    assigned_order_id = v_order.id,
    assigned_at = now()
  WHERE id = p_lead_id;

  -- 5. Decrement order and update timestamp
  UPDATE orders SET
    leads_remaining = leads_remaining - 1,
    leads_delivered = leads_delivered + 1,
    last_assigned_at = now()
  WHERE id = v_order.id;

  -- 6. Auto-complete order if depleted (unless bonus mode)
  UPDATE orders SET status = 'completed'
  WHERE id = v_order.id
    AND leads_remaining <= 0
    AND bonus_mode = false;

  -- 7. Log the assignment event
  INSERT INTO events (type, lead_id, broker_id, order_id, details)
  VALUES ('lead_assigned', p_lead_id, v_order.broker_id, v_order.id,
    jsonb_build_object(
      'vertical', v_lead.vertical,
      'credit_score', v_lead.credit_score,
      'order_remaining', v_order.leads_remaining - 1
    ));

  -- 8. Queue outbound delivery
  INSERT INTO webhook_deliveries (lead_id, broker_id, order_id, target_url, status)
  SELECT p_lead_id, v_order.broker_id, v_order.id, b.ghl_webhook_url, 'pending'
  FROM brokers b WHERE b.id = v_order.broker_id;

  RETURN jsonb_build_object(
    'status', 'assigned',
    'broker_id', v_order.broker_id,
    'order_id', v_order.id
  );
END;
$$ LANGUAGE plpgsql;
```

### Pattern 2: Async Outbound Delivery via pg_net + pg_cron Retry

**What:** After assignment, outbound webhook delivery uses pg_net for non-blocking HTTP POST to broker GHL sub-accounts. A pg_cron job scans for failed deliveries every 2 minutes and retries up to 3 times.

**When to use:** For all outbound webhook deliveries. The inbound webhook handler must return fast (business owners are waiting on a thank you page). pg_net fires the request asynchronously after the transaction commits, so the inbound handler returns in milliseconds.

**Trade-offs:**
- PRO: Non-blocking. Inbound handler returns immediately.
- PRO: Native Postgres. No external queue infrastructure needed.
- PRO: Built-in response tracking in `net._http_response`.
- CON: pg_net offers at-most-once delivery. You MUST build retry yourself.
- CON: Max 200 requests/second. Fine for lead volumes, but know the ceiling.
- CON: No PATCH/PUT support in pg_net. POST only (which is what GHL needs).

**Example:**
```sql
-- Trigger after webhook_deliveries insert: fire the outbound webhook
CREATE OR REPLACE FUNCTION fire_outbound_webhook()
RETURNS trigger AS $$
DECLARE
  v_lead record;
  v_request_id bigint;
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = NEW.lead_id;

  SELECT net.http_post(
    url := NEW.target_url,
    body := jsonb_build_object(
      'lead_id', v_lead.id,
      'first_name', v_lead.first_name,
      'last_name', v_lead.last_name,
      'email', v_lead.email,
      'phone', v_lead.phone,
      'vertical', v_lead.vertical,
      'credit_score', v_lead.credit_score,
      'ai_call_notes', v_lead.ai_call_notes
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  ) INTO v_request_id;

  UPDATE webhook_deliveries
  SET pg_net_request_id = v_request_id, status = 'sent', sent_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Retry scanner (called by pg_cron every 2 minutes)
CREATE OR REPLACE FUNCTION retry_failed_webhooks()
RETURNS void AS $$
DECLARE
  v_delivery record;
  v_response record;
  v_new_request_id bigint;
BEGIN
  FOR v_delivery IN
    SELECT wd.*
    FROM webhook_deliveries wd
    LEFT JOIN net._http_response r ON r.id = wd.pg_net_request_id
    WHERE wd.status IN ('sent', 'failed')
      AND wd.retry_count < 3
      AND (
        r.status_code IS NULL        -- no response yet (timeout)
        OR r.status_code >= 400      -- error response
      )
      AND wd.sent_at < now() - interval '30 seconds'  -- give it time
  LOOP
    -- Re-fire the webhook
    SELECT net.http_post(
      url := v_delivery.target_url,
      body := (SELECT to_jsonb(l) FROM leads l WHERE l.id = v_delivery.lead_id),
      headers := jsonb_build_object('Content-Type', 'application/json')
    ) INTO v_new_request_id;

    UPDATE webhook_deliveries SET
      pg_net_request_id = v_new_request_id,
      retry_count = retry_count + 1,
      status = 'retrying',
      last_retry_at = now()
    WHERE id = v_delivery.id;
  END LOOP;

  -- Mark permanently failed after 3 retries
  UPDATE webhook_deliveries SET status = 'failed_permanent'
  WHERE retry_count >= 3
    AND status IN ('sent', 'retrying', 'failed');
END;
$$ LANGUAGE plpgsql;

-- Schedule the retry scanner
SELECT cron.schedule(
  'retry-failed-webhooks',
  '*/2 * * * *',
  'SELECT retry_failed_webhooks()'
);
```

### Pattern 3: Realtime Dashboard via Supabase Broadcast

**What:** Use Supabase Realtime with Broadcast (not postgres_changes) for pushing live updates to the admin dashboard. A database trigger on the `events` table broadcasts each new event to a Realtime channel. Client-side React components subscribe and update UI.

**When to use:** For all dashboard live-update needs. Supabase docs explicitly recommend Broadcast over postgres_changes for production systems due to better scalability.

**Trade-offs:**
- PRO: Scalable. Broadcast handles 10,000+ concurrent connections.
- PRO: Sub-100ms latency for event delivery.
- PRO: Decoupled. Dashboard doesn't poll. Events push.
- CON: Requires a database trigger to broadcast (more SQL to maintain).
- CON: Broadcast is fire-and-forget. If dashboard is closed, events are missed (but that's fine, SSR loads fresh data on page open).

**Example (client-side):**
```typescript
// components/realtime/realtime-provider.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel('dashboard-events')
      .on('broadcast', { event: 'lead_assigned' }, (payload) => {
        // Update leads table, KPIs, activity feed
      })
      .on('broadcast', { event: 'lead_unassigned' }, (payload) => {
        // Update unassigned queue count
      })
      .on('broadcast', { event: 'order_completed' }, (payload) => {
        // Update orders table
      })
      .on('broadcast', { event: 'webhook_failed' }, (payload) => {
        // Show failure alert
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return <>{children}</>
}
```

### Pattern 4: Webhook Ingestion with Validation Layer

**What:** Inbound webhooks from GHL hit a Next.js Route Handler that validates the payload, normalizes the data, inserts into `leads`, then calls the assignment engine RPC. Use Route Handlers (not Server Actions) because these are external HTTP requests.

**When to use:** For all inbound webhook endpoints. Never trust external payloads. Validate schema, check for required fields, reject garbage early.

**Trade-offs:**
- PRO: Clean separation. Validation happens in TypeScript (easy to test). Assignment happens in SQL (atomic).
- PRO: Returns fast. Insert + RPC call, then respond 200.
- CON: Two layers to maintain (TS validation + SQL assignment).

**Example:**
```typescript
// app/api/webhooks/inbound/route.ts
import { createClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const leadSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  vertical: z.string(),
  credit_score: z.number().int().min(300).max(850).optional(),
  ghl_contact_id: z.string(),
  ai_call_notes: z.string().optional(),
})

export async function POST(request: Request) {
  // Validate webhook secret
  const secret = request.headers.get('x-webhook-secret')
  if (secret !== process.env.INBOUND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Parse and validate payload
  const body = await request.json()
  const result = leadSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'invalid_payload', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = createClient()

  // Insert lead
  const { data: lead, error } = await supabase
    .from('leads')
    .insert(result.data)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  // Trigger assignment engine
  const { data: assignment } = await supabase
    .rpc('assign_lead', { p_lead_id: lead.id })

  return NextResponse.json({
    lead_id: lead.id,
    assignment: assignment,
  }, { status: 200 })
}
```

## Data Flow

### Primary Flow: Lead Ingestion to Broker Delivery

```
GHL Main Account
    │
    │ POST /api/webhooks/inbound (with lead data)
    v
Next.js Route Handler
    │ 1. Validate webhook secret
    │ 2. Parse + validate payload (Zod)
    │ 3. INSERT into leads table
    │ 4. CALL assign_lead(lead_id) RPC
    v
Postgres assign_lead() Function
    │ 5. Acquire pg_advisory_xact_lock(1001, vertical_hash)
    │ 6. Query matching active orders (vertical + credit score)
    │ 7. Select best order (weighted rotation: leads_remaining ratio)
    │ 8. UPDATE lead with assignment
    │ 9. UPDATE order (decrement remaining, bump delivered)
    │ 10. Auto-complete order if depleted (unless bonus mode)
    │ 11. INSERT event log entry
    │ 12. INSERT webhook_delivery record
    │ 13. COMMIT (releases advisory lock)
    v
pg_net Trigger on webhook_deliveries
    │ 14. Fire async HTTP POST to broker's GHL webhook URL
    │     (non-blocking, happens after commit)
    v
Broker's GHL Sub-Account
    │ 15. Receives lead data
    │ 16. Triggers broker's automations (AI call, notifications)
    v
net._http_response Table
    │ 17. Stores response status
    v
pg_cron (every 2 min)
    │ 18. Scans for failed deliveries (status >= 400 or timeout)
    │ 19. Retries up to 3 times
    │ 20. Marks permanently failed after 3 attempts
    v
Dashboard (via Realtime Broadcast)
    │ 21. Events table trigger broadcasts to channel
    │ 22. Connected admin dashboards update in real-time
```

### Secondary Flow: Lead Update (AI Call Notes)

```
GHL Main Account
    │
    │ PATCH /api/webhooks/leads (with ghl_contact_id + notes)
    v
Next.js Route Handler
    │ 1. Validate, find lead by ghl_contact_id
    │ 2. UPDATE lead with ai_call_notes
    │ 3. If lead already delivered, re-fire outbound webhook
    │    (broker gets updated data)
    v
Events table + Realtime Broadcast
```

### Dashboard Flow: Server Components + Realtime

```
Admin opens dashboard
    │
    │ 1. Middleware checks session cookie
    v
Server Component renders
    │ 2. SSR fetches current data from Supabase
    │ 3. Returns fully rendered HTML
    v
Client hydrates
    │ 4. RealtimeProvider subscribes to broadcast channel
    │ 5. Incoming events update local state (optimistic)
    │ 6. Server Actions handle mutations (order start/pause/complete)
    v
Supabase (via Server Actions)
    │ 7. Writes go through server (never client-direct)
    │ 8. New events trigger broadcast to all connected dashboards
```

### Key Data Flows

1. **Lead Assignment Flow:** GHL webhook -> Route Handler -> INSERT lead -> RPC assign_lead() -> pg_net outbound -> broker GHL. Total time target: under 2 seconds end-to-end.

2. **Realtime Event Flow:** Any state change -> INSERT into events table -> Database trigger -> Supabase Broadcast -> All connected dashboard clients. Latency: sub-100ms.

3. **Retry Flow:** pg_cron (every 2 min) -> scan webhook_deliveries + net._http_response -> re-fire failed -> update retry count -> mark permanent failure after 3 attempts.

4. **Manual Assignment Flow:** Admin selects lead from unassigned queue -> Server Action calls assign_lead_manual(lead_id, order_id) -> same delivery pipeline fires.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 leads/day | Current architecture is overkill. Everything runs fine. Single Supabase instance handles it easily. |
| 100-1,000 leads/day | Sweet spot for this design. Advisory locks prevent races. pg_net handles 200 req/sec (way more than needed). Realtime Broadcast under no stress. |
| 1,000-10,000 leads/day | Still fine. Watch pg_cron retry scanner performance. Consider batching outbound webhooks. Index optimization on orders table becomes important. |
| 10,000+ leads/day | Advisory lock contention could appear if many leads share the same vertical. Consider per-order locking instead of per-vertical. pg_net's 200 req/sec limit may bottleneck. Move outbound delivery to Edge Functions or external queue. |

### Scaling Priorities

1. **First bottleneck: Advisory lock contention.** If high volume hits a single vertical, all leads for that vertical serialize through one lock. Fix: lock on a more granular key (e.g., per matching-order-set hash) or accept the serialization since it ensures fairness.

2. **Second bottleneck: pg_net throughput.** 200 req/sec is the documented ceiling. At high volumes, batch deliveries or move to Supabase Edge Functions called via pg_cron.

3. **Third bottleneck: Retry scanner scanning full table.** Fix: add index on `(status, retry_count, sent_at)` from day one. Partition `webhook_deliveries` by month if table gets large.

## Anti-Patterns

### Anti-Pattern 1: Assignment Logic in Application Code

**What people do:** Run the matching query in TypeScript, select a broker, then update the lead and order in separate database calls.
**Why it's wrong:** Race condition city. Two concurrent leads can read the same order's `leads_remaining`, both decrement it, and over-assign. Even with optimistic locking, you get failures and retries that add latency.
**Do this instead:** Single Postgres function with advisory lock. One transaction. Zero race conditions. The function IS the assignment engine.

### Anti-Pattern 2: Using postgres_changes for Dashboard Realtime

**What people do:** Subscribe to `postgres_changes` on the leads/orders/events tables directly.
**Why it's wrong:** Supabase docs explicitly state postgres_changes is for "quick testing and development" and "low amount of connected users." It has higher computational overhead and doesn't scale.
**Do this instead:** Database trigger on events table that calls Supabase Broadcast. Client subscribes to broadcast channel. Scales to 10,000+ connections.

### Anti-Pattern 3: Synchronous Outbound Webhooks

**What people do:** In the inbound webhook handler, call the broker's GHL webhook synchronously and wait for a response before returning.
**Why it's wrong:** Business owners are waiting on a thank you page. If the broker's webhook is slow or down, the inbound handler blocks. Timeout cascades back to GHL.
**Do this instead:** pg_net fires async after transaction commit. Inbound handler returns in milliseconds. Retry scanner handles failures separately.

### Anti-Pattern 4: Fat Client with Direct Database Writes

**What people do:** Use the Supabase browser client to directly insert/update orders and brokers from the dashboard.
**Why it's wrong:** Even with RLS, you lose server-side validation, audit logging, and the ability to enforce business rules. Plus, the service role key should never touch the browser.
**Do this instead:** Server Actions for all mutations. Server validates, writes, logs. Browser client only used for Realtime subscriptions (read-only channel).

### Anti-Pattern 5: Polling for Dashboard Updates

**What people do:** `setInterval(() => refetch(), 5000)` on every dashboard page.
**Why it's wrong:** Wastes bandwidth, hits Supabase rate limits at scale, always shows stale data between polls.
**Do this instead:** Supabase Realtime Broadcast. Push, not pull. Free with Supabase. Sub-100ms latency.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GHL Main Account (inbound) | Webhook POST to `/api/webhooks/inbound` | Validate with shared secret header. GHL sends on form submission. |
| GHL Main Account (lead updates) | Webhook PATCH to `/api/webhooks/leads` | Match on `ghl_contact_id`. AI call notes arrive here. |
| Broker GHL Sub-Accounts (outbound) | pg_net HTTP POST to broker's `ghl_webhook_url` | Each broker has a unique URL. POST with lead JSON payload. |
| Supabase Realtime | WebSocket from browser client | Channel: `dashboard-events`. Events: `lead_assigned`, `lead_unassigned`, `order_completed`, `webhook_failed`. |
| Vercel (hosting) | Next.js deployment | Route Handlers run as serverless functions. Watch cold start times on webhook endpoints. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Webhook Handler -> Assignment Engine | Supabase RPC (`assign_lead`) | TypeScript calls SQL. Clean boundary. Validation in TS, logic in SQL. |
| Assignment Engine -> Delivery | Database trigger on `webhook_deliveries` insert | Engine inserts delivery record, trigger fires pg_net. Fully decoupled. |
| Delivery -> Retry | pg_cron scheduled function | Retry scanner is independent. Reads delivery status, re-fires. No coupling to assignment. |
| Data Layer -> Dashboard | Supabase Realtime Broadcast | Database trigger on `events` broadcasts to channel. Dashboard subscribes. One-way push. |
| Dashboard -> Data Layer | Server Actions -> Supabase client | All writes go through server. Never browser-direct for mutations. |

## Build Order (Dependency Chain)

The architecture has clear dependency layers. Build bottom-up:

```
Phase 1: Foundation (no dependencies)
    ├── Database schema (tables, types, indexes)
    ├── Supabase project setup + local dev
    ├── Next.js project scaffold with auth
    └── Generated types from Supabase

Phase 2: Core Engine (depends on Phase 1)
    ├── assign_lead() Postgres function
    ├── Advisory lock implementation
    ├── Weighted rotation algorithm
    ├── Unassigned queue logic
    └── Events logging

Phase 3: Webhook Layer (depends on Phase 1, partially Phase 2)
    ├── Inbound webhook Route Handler + validation
    ├── Lead update PATCH endpoint
    ├── pg_net outbound delivery trigger
    ├── webhook_deliveries tracking table
    └── pg_cron retry scanner

Phase 4: Dashboard (depends on Phases 1-3)
    ├── Overview page (KPIs, activity feed)
    ├── Leads table + detail views
    ├── Brokers management
    ├── Orders management with inline actions
    ├── Unassigned queue + manual assignment
    └── Activity log

Phase 5: Realtime + Polish (depends on Phase 4)
    ├── Supabase Realtime Broadcast setup
    ├── Database triggers for event broadcasting
    ├── RealtimeProvider component
    ├── Live update handlers per dashboard view
    └── Theme toggle, UX polish
```

**Build order rationale:**
- Schema first because everything depends on it.
- Assignment engine before webhooks because you need to test assignment in isolation.
- Webhooks before dashboard because the dashboard displays data that webhooks create.
- Dashboard before realtime because you need the UI to exist before you can push updates to it.
- Realtime last because the dashboard works fine with SSR + manual refresh while you build it. Realtime is enhancement, not foundation.

## Sources

- [Supabase pg_net docs](https://supabase.com/docs/guides/database/extensions/pg_net) - Async HTTP from Postgres, 200 req/sec limit, at-most-once delivery (HIGH confidence)
- [Supabase Cron docs](https://supabase.com/docs/guides/cron) - pg_cron scheduling, max 8 concurrent jobs (HIGH confidence)
- [Supabase Realtime getting started](https://supabase.com/docs/guides/realtime/getting_started) - Broadcast vs postgres_changes recommendation (HIGH confidence)
- [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) - Client setup patterns (HIGH confidence)
- [PostgreSQL Advisory Locks explained](https://flaviodelgrosso.com/blog/postgresql-advisory-locks) - Session vs transaction locks, two-int key namespacing (MEDIUM confidence)
- [Distributed Locking with Postgres Advisory Locks](https://rclayton.silvrback.com/distributed-locking-with-postgres-advisory-locks) - Practical patterns (MEDIUM confidence)
- [Weighted Round Robin - Wikipedia](https://en.wikipedia.org/wiki/Weighted_round_robin) - Algorithm description, smooth variant (HIGH confidence)
- [Next.js App Router patterns 2026](https://dev.to/teguh_coding/nextjs-app-router-the-patterns-that-actually-matter-in-2026-146) - Route groups, Server Components default, Server Actions for mutations (MEDIUM confidence)
- [Next.js 16 project structure guide](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure) - Folder conventions, route groups (MEDIUM confidence)
- [Supabase webhook retry discussion](https://github.com/orgs/supabase/discussions/17664) - Custom retry pattern with pg_cron + pg_net (MEDIUM confidence)
- [Lead distribution systems overview](https://leadops.io/lead-distribution-systems/) - Domain patterns, hybrid routing (LOW confidence)

---
*Architecture research for: PPL Lead Management*
*Researched: 2026-03-12*
