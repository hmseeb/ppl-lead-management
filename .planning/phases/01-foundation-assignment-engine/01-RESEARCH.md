# Phase 1: Foundation + Assignment Engine - Research

**Researched:** 2026-03-12
**Domain:** Database schema, simple auth, broker/order CRUD, atomic lead assignment with Postgres advisory locks
**Confidence:** HIGH

## Summary

Phase 1 builds the entire foundation of the PPL Lead Management system from scratch: Next.js 16 project scaffold, Supabase schema (new tables alongside an existing `brokers` table with 12 rows), simple password auth, broker/order management UI, and the `assign_lead()` Postgres function that is the architectural loadbearing wall of the whole system. The project directory currently has nothing, no package.json, no app directory, no supabase directory. Everything must be created from zero.

The most critical technical challenge is the `assign_lead()` function. It must atomically match a lead to the best eligible broker order using weighted round-robin, decrement `leads_remaining`, log the decision, and hold unmatched leads with failure reasons. All inside a single Postgres function with `pg_advisory_xact_lock(1, 0)` to prevent race conditions. PostgREST (which Supabase JS uses under the hood) wraps each `rpc()` call in a transaction, so the advisory lock is held for exactly the duration of the function call and released on commit. This is confirmed by Supabase docs.

The existing `brokers` table MUST NOT be modified destructively. It has columns from ppl-onboarding (token, current_step, step_data, etc.) that are still in use. We ADD columns (like `status` if it doesn't exist in the needed form) and create new tables (`leads`, `orders`, `assignments`, `activity_log`, `unassigned_queue`) alongside it. The `crm_webhook_url` column IS the GHL webhook URL we need for lead delivery in Phase 3.

**Primary recommendation:** Build schema migrations first, then the `assign_lead()` function with comprehensive test cases, then auth + CRUD UI. The function must be proven correct before any webhook code touches it in Phase 2.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Admin access protected by simple password authentication with session cookie | iron-session for encrypted cookie sessions, bcryptjs for password hashing in Server Actions, Next.js middleware for route protection |
| BRKR-01 | Admin can create broker profiles (name, company, email, phone, GHL webhook URL) | Existing brokers table has these fields. Use react-hook-form + zod for forms, Server Actions for mutations |
| BRKR-02 | Admin can edit broker profiles | Server Actions with optimistic UI, same form pattern as create |
| BRKR-03 | Admin can set broker status (Active / Paused / Completed) | Status enum column on existing brokers table (check if `status` column exists and is compatible) |
| ORDR-01 | Admin can create orders linked to a broker with total leads purchased, vertical criteria (multi-select), and credit score minimum | New `orders` table with foreign key to brokers, verticals as text array, ShadCN multi-select pattern |
| ORDR-02 | System tracks leads_delivered and calculates leads_remaining per order | Computed in `assign_lead()` function, stored as columns on orders table |
| ORDR-03 | Admin can start, pause, resume, and complete orders | Status enum with transitions enforced in Server Actions |
| ORDR-04 | Admin can toggle bonus mode on an order | Boolean `bonus_mode` column, toggle via Server Action |
| ORDR-05 | System auto-completes orders when leads_remaining hits 0 and bonus mode is off | Handled inside `assign_lead()` function atomically |
| ORDR-06 | Pausing an order removes broker from rotation without losing remaining count or position | Status check in `assign_lead()` WHERE clause filters out paused orders |
| ASGN-01 | System filters eligible brokers by matching lead vertical against order accepted verticals (including "All") and lead credit score >= order credit score minimum | SQL WHERE clause: `(v_lead.vertical = ANY(o.verticals) OR 'All' = ANY(o.verticals)) AND v_lead.credit_score >= o.credit_score_min` |
| ASGN-02 | System uses weighted round-robin rotation based on leads_remaining | ORDER BY `(leads_remaining::float / GREATEST(total_leads, 1)) DESC, last_assigned_at ASC NULLS FIRST` |
| ASGN-03 | System tracks last_assigned timestamp per order for rotation fairness | `last_assigned_at` column on orders table, updated in assign_lead() |
| ASGN-04 | System uses Postgres advisory locks for atomic lead assignment | `pg_advisory_xact_lock(1, 0)` inside assign_lead(), PostgREST wraps RPC in transaction |
| ASGN-05 | System assigns lead, decrements leads_remaining (unless bonus mode), updates last_assigned, fires outbound webhook in one atomic flow | All inside assign_lead() function. Outbound webhook delivery record queued (actual firing deferred to Phase 3) |
| ASGN-06 | System holds unmatched leads in unassigned queue with detailed match failure reasons | Insert into unassigned_queue with structured reason (which criteria failed, what values were checked) |
| ASGN-07 | System logs every assignment decision for audit | Insert into activity_log table within assign_lead() transaction |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ~16.1.6 | Full-stack React framework | Ecosystem constraint (matches ppl-onboarding). App Router, Server Actions, Route Handlers |
| React | ^19.0.0 | UI library | Required by Next.js 16. Server Components for dashboard shells |
| TypeScript | ^5.0.0 | Type safety | Catches schema mismatches between webhook payloads and DB types |
| @supabase/supabase-js | ^2.99.0 | Supabase JS client | Official SDK for DB queries, RPC calls. REST API handles connection pooling |
| @supabase/ssr | ^0.9.0 | Server-side Supabase client | createServerClient for Server Components/Actions, createBrowserClient for client |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| iron-session | ^8.0.0 | Encrypted cookie sessions | Auth: login/logout/session check. Works with App Router, Server Actions, middleware |
| bcryptjs | ^3.0.0 | Password hashing | Hash/verify admin password in Server Actions (NOT in middleware, edge runtime incompatible) |
| zod | ~3.24.0 | Schema validation | Form validation, RPC response typing. Pin to v3, NOT v4 (resolver compatibility) |
| react-hook-form | ^7.71.0 | Form state management | Broker and order create/edit forms |
| @hookform/resolvers | ^5.2.0 | Zod-to-RHF bridge | Connect zod schemas to react-hook-form |
| shadcn/ui | latest CLI | UI components | Button, Card, Dialog, Form, Input, Select, Table, Badge, Separator, DropdownMenu |
| @tanstack/react-table | ^8.21.0 | Data tables | Brokers table, orders table (server-side sort/filter) |
| lucide-react | ^0.577.0 | Icons | ShadCN default icon library |
| sonner | ^2.0.0 | Toast notifications | Success/error feedback on CRUD operations |
| tailwindcss | ^4.0.0 | Utility CSS | ShadCN dependency, CSS-first config in v4 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| iron-session | jose + manual cookies | jose is lower-level. iron-session provides the right abstraction for "encrypted session in cookie" with zero config. |
| bcryptjs | bcrypt-ts | bcrypt-ts is ~30% slower (pure JS). bcryptjs is more battle-tested. Both work in Node runtime. |
| zod v3 | zod v4 | v4 has active compatibility bugs with @hookform/resolvers. Pin v3 until resolvers issue #813 is fixed. |
| react-hook-form | Native form + useActionState | RHF gives client-side validation before server round-trip. useActionState alone means server-only validation. |

**Installation:**
```bash
# Create Next.js project
bunx create-next-app@latest ppl-leadr-mgmt --typescript --tailwind --eslint --app --turbopack --src-dir

# Core dependencies
bun add @supabase/supabase-js @supabase/ssr

# Auth
bun add iron-session bcryptjs
bun add -D @types/bcryptjs

# Forms & validation
bun add react-hook-form @hookform/resolvers zod@3

# Data tables
bun add @tanstack/react-table

# UI utilities
bun add sonner lucide-react

# Tailwind animation
bun add -D tw-animate-css

# Dev tools
bun add -D supabase typescript @types/react @types/react-dom

# Initialize ShadCN
bunx shadcn@latest init

# Add ShadCN components needed for Phase 1
bunx shadcn@latest add button card dialog dropdown-menu form input label select table badge separator toast tabs sheet
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx           # Password login form
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Dashboard shell with nav
│   │   ├── page.tsx               # Redirect to /brokers or overview stub
│   │   ├── brokers/
│   │   │   ├── page.tsx           # Brokers table
│   │   │   └── new/
│   │   │       └── page.tsx       # Create broker form
│   │   └── orders/
│   │       ├── page.tsx           # Orders table with inline actions
│   │       └── new/
│   │           └── page.tsx       # Create order form (linked to broker)
│   ├── api/                       # Empty for now, webhook endpoints in Phase 2
│   ├── layout.tsx                 # Root layout, theme provider
│   └── middleware.ts              # Auth guard: check iron-session cookie
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # createBrowserClient (for future realtime)
│   │   ├── server.ts              # createServerClient (SSR reads)
│   │   └── admin.ts               # Service role client (bypasses RLS)
│   ├── auth/
│   │   ├── session.ts             # iron-session config + getSession helper
│   │   └── actions.ts             # login/logout Server Actions
│   ├── actions/
│   │   ├── brokers.ts             # Broker CRUD Server Actions
│   │   └── orders.ts              # Order CRUD + lifecycle Server Actions
│   ├── schemas/
│   │   ├── broker.ts              # Zod schemas for broker forms
│   │   └── order.ts               # Zod schemas for order forms
│   └── types/
│       └── database.ts            # Generated Supabase types
├── components/
│   ├── ui/                        # ShadCN primitives (auto-generated)
│   ├── brokers/
│   │   ├── broker-form.tsx        # Create/edit broker form
│   │   ├── brokers-table.tsx      # Brokers data table
│   │   └── broker-status-badge.tsx
│   ├── orders/
│   │   ├── order-form.tsx         # Create order form
│   │   ├── orders-table.tsx       # Orders data table with inline actions
│   │   └── order-status-badge.tsx
│   └── layout/
│       ├── sidebar.tsx            # Dashboard navigation
│       └── header.tsx             # Top bar
supabase/
├── migrations/
│   ├── 00001_enable_extensions.sql     # pg_cron, pg_net
│   ├── 00002_alter_brokers.sql         # Add columns to existing brokers table
│   ├── 00003_create_tables.sql         # leads, orders, activity_log, unassigned_queue
│   ├── 00004_create_indexes.sql        # Performance indexes
│   ├── 00005_enable_rls.sql            # RLS on all tables
│   └── 00006_assign_lead_function.sql  # The assign_lead() function
├── seed.sql                            # Dev seed data (brokers, orders, test leads)
└── config.toml                         # Supabase local dev config
```

### Pattern 1: Database-Driven Assignment Engine

**What:** The entire lead matching and assignment logic runs as a single Postgres function (`assign_lead()`), called via Supabase RPC. PostgREST wraps each RPC call in a transaction, so `pg_advisory_xact_lock()` inside the function holds the lock for exactly the function duration.

**When to use:** Always. This is the core architectural decision.

**Example:**
```sql
-- Source: Architecture research + PostgreSQL advisory locks docs
CREATE OR REPLACE FUNCTION assign_lead(p_lead_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_lead record;
  v_order record;
  v_reason text;
BEGIN
  -- 1. Acquire global assignment lock (namespace=1, id=0)
  -- Two-integer form avoids collision with Supabase GoTrue locks
  PERFORM pg_advisory_xact_lock(1, 0);

  -- 2. Fetch the lead
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'lead_not_found');
  END IF;

  -- 3. Find best matching active order (weighted rotation)
  SELECT o.* INTO v_order
  FROM orders o
  JOIN brokers b ON b.id = o.broker_id
  WHERE o.status = 'active'
    AND b.status = 'active'
    AND (v_lead.vertical = ANY(o.verticals) OR 'All' = ANY(o.verticals))
    AND (o.credit_score_min IS NULL OR v_lead.credit_score >= o.credit_score_min)
    AND (o.leads_remaining > 0 OR o.bonus_mode = true)
  ORDER BY
    -- Weighted: orders with more remaining get proportionally more leads
    (o.leads_remaining::float / GREATEST(o.total_leads, 1)) DESC,
    -- Tiebreaker: least recently assigned
    o.last_assigned_at ASC NULLS FIRST
  LIMIT 1;

  IF NOT FOUND THEN
    -- Build detailed failure reason
    v_reason := build_match_failure_reason(v_lead);

    INSERT INTO unassigned_queue (lead_id, reason, details)
    VALUES (p_lead_id, 'no_matching_active_order', v_reason);

    INSERT INTO activity_log (event_type, lead_id, details)
    VALUES ('lead_unassigned', p_lead_id,
      jsonb_build_object('reason', v_reason, 'vertical', v_lead.vertical,
        'credit_score', v_lead.credit_score));

    RETURN jsonb_build_object('status', 'unassigned', 'reason', v_reason);
  END IF;

  -- 4. Assign the lead
  UPDATE leads SET
    assigned_broker_id = v_order.broker_id,
    assigned_order_id = v_order.id,
    assigned_at = now(),
    status = 'assigned'
  WHERE id = p_lead_id;

  -- 5. Decrement order (unless bonus mode)
  UPDATE orders SET
    leads_delivered = leads_delivered + 1,
    leads_remaining = CASE WHEN bonus_mode THEN leads_remaining ELSE leads_remaining - 1 END,
    last_assigned_at = now()
  WHERE id = v_order.id;

  -- 6. Auto-complete if depleted and not bonus
  UPDATE orders SET status = 'completed'
  WHERE id = v_order.id
    AND leads_remaining <= 0
    AND bonus_mode = false;

  -- 7. Log the assignment
  INSERT INTO activity_log (event_type, lead_id, broker_id, order_id, details)
  VALUES ('lead_assigned', p_lead_id, v_order.broker_id, v_order.id,
    jsonb_build_object(
      'vertical', v_lead.vertical,
      'credit_score', v_lead.credit_score,
      'order_remaining', CASE WHEN v_order.bonus_mode THEN v_order.leads_remaining
        ELSE v_order.leads_remaining - 1 END,
      'bonus_mode', v_order.bonus_mode
    ));

  RETURN jsonb_build_object(
    'status', 'assigned',
    'broker_id', v_order.broker_id,
    'order_id', v_order.id
  );
END;
$$ LANGUAGE plpgsql;
```

### Pattern 2: Simple Password Auth with iron-session

**What:** Single shared password stored as bcrypt hash in env var. iron-session provides encrypted cookie sessions. Middleware checks for valid session cookie on protected routes.

**When to use:** For AUTH-01. No Supabase Auth, no NextAuth, no JWT complexity.

**Example:**
```typescript
// Source: iron-session docs + Next.js auth guide
// lib/auth/session.ts
import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,  // 32+ char secret
  cookieName: 'ppl-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
```

```typescript
// lib/auth/actions.ts
'use server'
import { compare } from 'bcryptjs'
import { getSession } from './session'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const password = formData.get('password') as string
  const isValid = await compare(password, process.env.ADMIN_PASSWORD_HASH!)

  if (!isValid) {
    return { error: 'invalid password' }
  }

  const session = await getSession()
  session.isLoggedIn = true
  await session.save()
  redirect('/')
}
```

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/auth/session'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(
    request, response, sessionOptions
  )

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico).*)'],
}
```

### Pattern 3: Server Actions for All Mutations

**What:** All broker/order CRUD goes through Server Actions. Forms use react-hook-form for client validation, then submit to Server Actions for server validation + Supabase write.

**When to use:** Every create/edit/status-change operation.

**Example:**
```typescript
// Source: Next.js Server Actions docs + react-hook-form patterns
// lib/actions/orders.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/admin'
import { orderSchema } from '@/lib/schemas/order'

export async function createOrder(data: unknown) {
  const parsed = orderSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const supabase = createClient()
  const { error } = await supabase.from('orders').insert({
    broker_id: parsed.data.broker_id,
    total_leads: parsed.data.total_leads,
    leads_remaining: parsed.data.total_leads,
    leads_delivered: 0,
    verticals: parsed.data.verticals,
    credit_score_min: parsed.data.credit_score_min,
    status: 'active',
    bonus_mode: false,
  })

  if (error) return { error: error.message }
  revalidatePath('/orders')
  return { success: true }
}

export async function toggleOrderStatus(orderId: string, newStatus: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (error) return { error: error.message }
  revalidatePath('/orders')
  return { success: true }
}
```

### Pattern 4: Supabase Client Separation

**What:** Three Supabase clients for different contexts. Server client for SSR reads (respects RLS via cookie auth, though we bypass with service role for admin-only app). Admin client with service role key for Server Actions (bypasses RLS). Browser client for future Realtime subscriptions.

**When to use:** Always follow this separation. Never expose service role key to the browser.

**Example:**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

```typescript
// lib/supabase/admin.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### Anti-Patterns to Avoid

- **Assignment logic in TypeScript:** NEVER. The entire match-assign-decrement-log flow must be a single Postgres function. Application-level rotation state guarantees race conditions.
- **Direct browser writes:** NEVER write to Supabase from client components. All mutations go through Server Actions. Service role key never touches the browser.
- **Destructive changes to existing brokers table:** NEVER rename or remove existing columns. The ppl-onboarding app depends on them. Only ADD new columns.
- **bcrypt in middleware:** NEVER. Edge runtime doesn't support native bcrypt. Middleware only checks the iron-session cookie. Password hashing happens in Server Actions (Node runtime).
- **Skip RLS on new tables:** NEVER. Enable RLS on every table immediately. Even for admin-only tables, the anon key can hit PostgREST. Use service role key server-side to bypass.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom cookie encryption | iron-session v8 | Handles encryption, serialization, expiry, cookie options. Battle-tested. |
| Password hashing | Custom hash function | bcryptjs | Constant-time comparison, configurable rounds, handles salt automatically |
| Form validation | Manual field checks | zod + react-hook-form | Shared schemas between client forms and server validation. Type inference. |
| Data tables | Custom table component | @tanstack/react-table + ShadCN | Sorting, filtering, pagination, column visibility. Headless = full control. |
| Advisory lock management | Application-level mutex | pg_advisory_xact_lock | Database-native, transaction-scoped, automatic cleanup. No stale locks. |
| Type generation | Manual type definitions | `supabase gen types typescript` | Auto-generated from actual schema. Always in sync. |

**Key insight:** The assignment engine is the ONLY complex custom code in this phase. Everything else uses well-established libraries. Don't waste time building infrastructure that already exists.

## Common Pitfalls

### Pitfall 1: Existing Brokers Table Destruction

**What goes wrong:** Migration accidentally renames, removes, or alters existing columns on the `brokers` table that ppl-onboarding depends on.
**Why it happens:** Developer treats this as a greenfield schema design, not an additive modification to a shared database.
**How to avoid:** Migration MUST use `ALTER TABLE brokers ADD COLUMN IF NOT EXISTS` for new columns. Never `DROP COLUMN`, never `ALTER COLUMN ... TYPE`. The existing columns (token, current_step, step_data, ghl_contact_id, etc.) stay untouched.
**Warning signs:** ppl-onboarding breaking after migration runs. Check the existing schema before writing any migration.

### Pitfall 2: Advisory Lock Collision with GoTrue

**What goes wrong:** Using single-bigint form `pg_advisory_xact_lock(12345)` collides with Supabase's internal GoTrue auth locks.
**Why it happens:** GoTrue uses the single-bigint advisory lock form. If your lock ID happens to match, they block each other.
**How to avoid:** Always use the two-integer form: `pg_advisory_xact_lock(1, 0)`. GoTrue uses single-bigint, two-int form is a separate key space. Document the namespace: 1 = assignment engine.
**Warning signs:** Assignment function occasionally hangs for the full statement timeout duration. Auth operations slow down under lead volume.

### Pitfall 3: "All" Vertical Not Matching

**What goes wrong:** Order with verticals `['All']` doesn't match incoming leads because the WHERE clause checks `v_lead.vertical = ANY(o.verticals)` and no lead has vertical = 'All'.
**Why it happens:** 'All' is a meta-value meaning "accept any vertical," not a literal vertical name. Must be handled as a special case.
**How to avoid:** WHERE clause must include: `(v_lead.vertical = ANY(o.verticals) OR 'All' = ANY(o.verticals))`. The OR condition catches orders that accept all verticals.
**Warning signs:** Orders with 'All' verticals never receiving any leads.

### Pitfall 4: leads_remaining Going Negative

**What goes wrong:** Two concurrent assignments to the same order both decrement `leads_remaining` from 1 to 0, resulting in -1.
**Why it happens:** Without the advisory lock, or if the lock isn't global (per-lead instead of global), two assignments can read the same remaining count.
**How to avoid:** The `pg_advisory_xact_lock(1, 0)` serializes ALL assignments. Only one can run at a time. Additionally, add a CHECK constraint: `CHECK (leads_remaining >= 0 OR bonus_mode = true)`.
**Warning signs:** `leads_remaining` going negative in the orders table. Orders not auto-completing when they should.

### Pitfall 5: RLS Blocking Service Role Client

**What goes wrong:** RLS is enabled but the admin client still gets blocked because it was initialized with anon key instead of service role key.
**Why it happens:** Copy-paste error using the wrong env var. Or using the server client (anon key + cookies) instead of admin client (service role key) for mutations.
**How to avoid:** Server Actions that write data MUST use `lib/supabase/admin.ts` (service role key). Server Components that read data can use either. Grep for `SERVICE_ROLE` in client components should return zero results.
**Warning signs:** 403 errors on insert/update operations that should work.

### Pitfall 6: iron-session in Edge vs Node Runtime

**What goes wrong:** iron-session works in middleware (edge runtime) for reading sessions, but bcryptjs does NOT work in edge runtime.
**Why it happens:** bcrypt uses native Node.js crypto bindings unavailable in edge runtime.
**How to avoid:** Password hashing (bcryptjs) ONLY in Server Actions (Node runtime). Middleware ONLY reads the iron-session cookie to check `isLoggedIn`. Never hash passwords in middleware.
**Warning signs:** Build errors mentioning "crypto module not found" or "native module not available."

### Pitfall 7: Weighted Rotation Starvation

**What goes wrong:** A broker with 1 lead remaining never gets served because a broker with 100 remaining always has a higher ratio.
**Why it happens:** The weighted rotation formula `(leads_remaining / total_leads) DESC` always favors the order with the highest ratio. If one order has 100/100 remaining and another has 1/10, the first always wins.
**How to avoid:** The formula is correct. 100/100 = 1.0, 1/10 = 0.1. The larger order SHOULD get more leads (that's what "weighted by remaining" means). The tiebreaker `last_assigned_at ASC NULLS FIRST` ensures that orders with equal ratios rotate fairly. Test with realistic scenarios to confirm distribution matches expectations.
**Warning signs:** Distribution percentages diverging significantly from expected ratios over 50+ assignments.

## Code Examples

### Database Schema: New Tables

```sql
-- Source: Architecture research + REQUIREMENTS.md

-- Enable extensions (future phases need these, enable now)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verticals enum for type safety
CREATE TYPE vertical_type AS ENUM (
  'MCA', 'SBA', 'Equipment Finance', 'Working Capital', 'Lines of Credit', 'All'
);

-- Broker status (check if existing brokers.status column conflicts)
-- If existing column uses different values, add a new column
CREATE TYPE broker_status AS ENUM ('active', 'paused', 'completed');

-- Order status
CREATE TYPE order_status AS ENUM ('active', 'paused', 'completed');

-- Lead status
CREATE TYPE lead_status AS ENUM ('pending', 'assigned', 'unassigned');

-- Orders table (new)
CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  total_leads integer NOT NULL CHECK (total_leads > 0),
  leads_delivered integer NOT NULL DEFAULT 0,
  leads_remaining integer NOT NULL,
  verticals text[] NOT NULL,  -- text array, includes 'All' option
  credit_score_min integer,
  status order_status NOT NULL DEFAULT 'active',
  bonus_mode boolean NOT NULL DEFAULT false,
  last_assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_remaining_check CHECK (leads_remaining >= 0 OR bonus_mode = true)
);

-- Leads table (new)
CREATE TABLE leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ghl_contact_id text UNIQUE,           -- GHL unique identifier
  first_name text,
  last_name text,
  email text,
  phone text,
  business_name text,
  vertical text,
  credit_score integer,
  funding_amount numeric,
  funding_purpose text,
  state text,
  ai_call_notes text,
  ai_call_status text,
  raw_payload jsonb,                     -- Store full webhook payload
  status lead_status NOT NULL DEFAULT 'pending',
  assigned_broker_id uuid REFERENCES brokers(id),
  assigned_order_id uuid REFERENCES orders(id),
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Activity log (new)
CREATE TABLE activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,              -- lead_assigned, lead_unassigned, order_created, etc.
  lead_id uuid REFERENCES leads(id),
  broker_id uuid REFERENCES brokers(id),
  order_id uuid REFERENCES orders(id),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unassigned queue (new)
CREATE TABLE unassigned_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) UNIQUE,
  reason text NOT NULL,
  details text,                          -- Human-readable failure explanation
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_orders_status_broker ON orders(status, broker_id);
CREATE INDEX idx_orders_active_assignment ON orders(status, last_assigned_at)
  WHERE status = 'active';
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_ghl_contact_id ON leads(ghl_contact_id);
CREATE INDEX idx_leads_assigned_broker ON leads(assigned_broker_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_type ON activity_log(event_type, created_at DESC);
CREATE INDEX idx_unassigned_queue_resolved ON unassigned_queue(resolved)
  WHERE resolved = false;

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE unassigned_queue ENABLE ROW LEVEL SECURITY;

-- Also enable RLS on existing brokers table if not already enabled
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
```

### Supabase Type Generation

```bash
# Generate types from remote project
bunx supabase gen types typescript --project-id "kovcroqqudozpaocpeks" --schema public > src/lib/types/database.ts

# Or from local dev
bunx supabase gen types typescript --local > src/lib/types/database.ts
```

### Zod Schema for Order Creation

```typescript
// lib/schemas/order.ts
import { z } from 'zod'

const VERTICALS = [
  'MCA', 'SBA', 'Equipment Finance',
  'Working Capital', 'Lines of Credit', 'All'
] as const

export const orderSchema = z.object({
  broker_id: z.string().uuid(),
  total_leads: z.number().int().min(1, 'Must purchase at least 1 lead'),
  verticals: z.array(z.enum(VERTICALS)).min(1, 'Select at least one vertical'),
  credit_score_min: z.number().int().min(300).max(850).nullable().optional(),
})
```

### Calling assign_lead() via RPC

```typescript
// lib/assignment/assign.ts
import { createClient } from '@/lib/supabase/admin'

export async function assignLead(leadId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('assign_lead', {
    p_lead_id: leadId,
  })

  if (error) throw new Error(`Assignment failed: ${error.message}`)
  return data as { status: string; broker_id?: string; order_id?: string; reason?: string }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr | 2024 | New package for App Router. auth-helpers is deprecated. |
| tailwind.config.js | CSS-first config (Tailwind v4) | 2025 | No JS config file. @import "tailwindcss" in CSS. |
| Supabase database.types.ts (manual) | `supabase gen types` CLI | Ongoing | Auto-generated, always in sync with schema |
| next-auth for simple auth | iron-session or jose | Ongoing | next-auth is overkill for single-password apps |
| zod v3 | zod v4 released but has RHF compatibility issues | 2025 | Pin to v3 until @hookform/resolvers issue #813 resolved |
| ShadCN v0 (shadcn-ui) | ShadCN CLI v4 (shadcn) | 2025 | New CLI, Tailwind v4 compatible |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not install.
- `tailwind.config.js`: Tailwind v4 uses CSS-first config. No JS config file.
- `zod v4`: Do NOT upgrade. Active compatibility issues with react-hook-form resolvers.

## Open Questions

1. **Existing brokers.status column compatibility**
   - What we know: The existing brokers table has a `status` column. We need broker status as Active/Paused/Completed.
   - What's unclear: What values does the existing `status` column hold? Is it an enum? What does ppl-onboarding use it for?
   - Recommendation: Query the existing schema before writing migrations. If the existing `status` column stores onboarding status (e.g., 'pending', 'approved'), add a separate `assignment_status` column for our needs. If it's already compatible, use it.

2. **Existing brokers table RLS status**
   - What we know: RLS should be enabled on all tables. The existing brokers table may or may not have RLS enabled.
   - What's unclear: Does ppl-onboarding use RLS on the brokers table? What policies exist?
   - Recommendation: Check existing RLS policies before enabling. If RLS is already enabled, add our policies alongside existing ones. If not enabled, enabling it could break ppl-onboarding if it uses the anon key for reads.

3. **ADMIN_PASSWORD_HASH format**
   - What we know: .env.local has ADMIN_PASSWORD. We need the bcrypt hash, not the plaintext password.
   - What's unclear: Is the current ADMIN_PASSWORD value plaintext or already hashed?
   - Recommendation: Generate bcrypt hash from the password and store as ADMIN_PASSWORD_HASH. Keep original ADMIN_PASSWORD for reference but use the hash for comparison.

4. **SESSION_SECRET env var**
   - What we know: iron-session needs a 32+ character secret for cookie encryption.
   - What's unclear: This env var doesn't exist yet.
   - Recommendation: Generate a random 32-char string and add to .env.local as SESSION_SECRET.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL Advisory Locks docs](https://www.postgresql.org/docs/current/explicit-locking.html) - Transaction-scoped advisory locks, two-integer form key space
- [Supabase RPC docs](https://supabase.com/docs/reference/javascript/rpc) - PostgREST wraps RPC calls in transactions
- [Supabase SSR docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) - createServerClient/createBrowserClient setup
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - Service role key bypasses RLS
- [Supabase type generation](https://supabase.com/docs/guides/api/rest/generating-types) - `supabase gen types typescript`
- [Supabase pg_cron docs](https://supabase.com/docs/guides/database/extensions/pg_cron) - Extension enable process
- [Supabase pg_net docs](https://supabase.com/docs/guides/database/extensions/pg_net) - Extension enable process
- [Next.js Auth guide](https://nextjs.org/docs/app/guides/authentication) - Middleware patterns, session management
- [Next.js create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app) - Project scaffolding
- [iron-session GitHub](https://github.com/vvo/iron-session) - v8 App Router compatibility, Server Actions support
- [zod v4 + RHF issue](https://github.com/react-hook-form/resolvers/issues/813) - Active compatibility bug

### Secondary (MEDIUM confidence)
- [Advisory lock collision with GoTrue](https://github.com/supabase/supabase-js/issues/1594) - Known issue, use two-int form to avoid
- [Advisory Locks Best Practice](https://supaexplorer.com/best-practices/supabase-postgres/lock-advisory/) - Namespace convention
- [bcrypt in Next.js middleware issue](https://github.com/vercel/next.js/issues/69002) - Cannot use bcrypt in edge runtime
- [PostgREST RPC transactions](https://dev.to/voboda/gotcha-supabase-postgrest-rpc-with-transactions-45a7) - RPC calls wrapped in transaction

### Tertiary (LOW confidence)
- None. All critical claims verified through official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified against official docs, ecosystem constraints from ppl-onboarding honored
- Architecture: HIGH - assign_lead() pattern fully specified in architecture research, advisory lock behavior verified in PostgreSQL docs, PostgREST transaction wrapping confirmed
- Pitfalls: HIGH - Existing brokers table constraint, advisory lock collision, edge runtime limitation all verified through official sources
- Schema design: MEDIUM - Existing brokers table column compatibility (status, RLS) needs verification against live database before migration

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable technologies, 30-day window)
