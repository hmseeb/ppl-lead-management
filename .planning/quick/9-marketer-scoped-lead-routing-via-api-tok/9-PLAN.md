---
phase: quick-9
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260327_marketer_tokens_and_lead_source.sql
  - src/lib/types/database.ts
  - src/lib/actions/marketers.ts
  - src/lib/queries/marketers.ts
  - src/lib/assignment/assign.ts
  - src/app/api/leads/incoming/route.ts
  - src/components/marketers/marketers-table.tsx
  - src/app/(dashboard)/page.tsx
autonomous: true
requirements: [MKTLEAD-01, MKTLEAD-02, MKTLEAD-03, MKTLEAD-04, MKTLEAD-05]

must_haves:
  truths:
    - "Leads posted with a marketer Bearer token are routed only to that marketer's assigned brokers"
    - "Leads posted without a token continue through existing global routing unchanged"
    - "Marketer tokens are auto-generated on creation with mkt_ prefix"
    - "Admin can see and copy marketer tokens in the marketers table"
    - "Marketer can see and copy their own API token on the dashboard overview"
    - "leads.marketer_id is set when a lead arrives via marketer token"
  artifacts:
    - path: "supabase/migrations/20260327_marketer_tokens_and_lead_source.sql"
      provides: "token column on marketers, marketer_id column on leads"
      contains: "ALTER TABLE marketers ADD COLUMN token"
    - path: "src/lib/assignment/assign.ts"
      provides: "Scoped broker filtering in assignment engine"
      exports: ["assignLead"]
    - path: "src/app/api/leads/incoming/route.ts"
      provides: "Bearer token auth + marketer-scoped routing"
      contains: "authorization"
  key_links:
    - from: "src/app/api/leads/incoming/route.ts"
      to: "marketers table"
      via: "Bearer token lookup"
      pattern: "authorization.*bearer"
    - from: "src/app/api/leads/incoming/route.ts"
      to: "src/lib/assignment/assign.ts"
      via: "brokerIds param passed to assignLead"
      pattern: "assignLead.*brokerIds"
    - from: "src/lib/assignment/assign.ts"
      to: "orders query"
      via: "broker_id filter on orders fetch"
      pattern: "\\.in\\(.*broker_id"
---

<objective>
Add marketer-scoped lead routing via API tokens. When a lead arrives at POST /api/leads/incoming with a valid Bearer token matching a marketer, the lead is tagged with that marketer's ID and routing is scoped to only the marketer's assigned brokers. Without a token, the existing global routing continues untouched.

Purpose: Marketers get their own API token to submit leads that route exclusively to their brokers.
Output: DB migration, updated API route, updated assignment engine, admin token UI, marketer token display.
</objective>

<execution_context>
@/Users/haseeb/.claude/get-shit-done/workflows/execute-plan.md
@/Users/haseeb/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/leads/incoming/route.ts
@src/lib/assignment/assign.ts
@src/lib/assignment/scoring.ts
@src/lib/actions/marketers.ts
@src/lib/queries/marketers.ts
@src/components/marketers/marketers-table.tsx
@src/lib/types/database.ts
@src/lib/auth/role.ts
@src/app/(dashboard)/page.tsx
@supabase/migrations/20260326_marketers.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database migration + types + backend logic (token column, marketer_id, scoped routing)</name>
  <files>
    supabase/migrations/20260327_marketer_tokens_and_lead_source.sql
    src/lib/types/database.ts
    src/lib/actions/marketers.ts
    src/lib/queries/marketers.ts
    src/lib/assignment/assign.ts
    src/app/api/leads/incoming/route.ts
  </files>
  <action>
    **1. Create migration `supabase/migrations/20260327_marketer_tokens_and_lead_source.sql`:**
    - `ALTER TABLE marketers ADD COLUMN token text NOT NULL DEFAULT ('mkt_' || gen_random_uuid()::text) UNIQUE;`
    - `ALTER TABLE leads ADD COLUMN marketer_id uuid REFERENCES marketers(id);`
    - `CREATE INDEX idx_leads_marketer_id ON leads(marketer_id);`
    - `CREATE INDEX idx_marketers_token ON marketers(token);`
    This backfills existing marketers with auto-generated tokens.

    **2. Update `src/lib/types/database.ts`:**
    - Add `token: string` to marketers Row type
    - Add `token?: string` to marketers Insert type (has DB default)
    - Add `token?: string` to marketers Update type
    - Add `marketer_id: string | null` to leads Row type
    - Add `marketer_id?: string | null` to leads Insert and Update types
    - Add the FK relationship for leads -> marketers: `{ foreignKeyName: "leads_marketer_id_fkey", columns: ["marketer_id"], isOneToOne: false, referencedRelation: "marketers", referencedColumns: ["id"] }`

    **3. Update `src/lib/actions/marketers.ts` createMarketer function:**
    - Generate token in JS before insert: `const token = 'mkt_' + crypto.randomUUID()`
    - Add `token` field to the insert object
    - This ensures the token is predictable and not relying on DB default alone

    **4. Update `src/lib/queries/marketers.ts` fetchMarketers function:**
    - Add `token` to the select string: `id, email, first_name, last_name, phone, status, created_at, token, marketer_brokers ( broker_id )`

    **5. Update `src/lib/assignment/assign.ts` assignLead function:**
    - Change signature to: `assignLead(leadId: string, brokerIds?: string[]): Promise<AssignmentResult>`
    - After fetching rawOrders (step 2), if `brokerIds` is provided and non-empty, filter rawOrders: `const filtered = brokerIds ? rawOrders.filter(o => brokerIds.includes(o.broker_id)) : rawOrders`
    - Use `filtered` (or `rawOrders` if no brokerIds) for the rest of the function (the `.map()` to `orders` and scoring)
    - The scoring engine itself is untouched. Only the candidate pool is narrowed.

    **6. Update `src/app/api/leads/incoming/route.ts` POST handler:**
    - After JSON parsing and Zod validation (after line 24), before the idempotency check:
    - Extract authorization header: `const authHeader = request.headers.get('authorization')`
    - Declare `let marketerId: string | null = null` and `let scopedBrokerIds: string[] | undefined = undefined`
    - If authHeader starts with 'Bearer ' (case-insensitive check on "Bearer"):
      - Extract token: `const token = authHeader.slice(7).trim()`
      - Look up marketer: `const { data: marketer } = await supabase.from('marketers').select('id, status').eq('token', token).single()`
      - If no marketer found: return 401 `{ error: 'invalid_token' }`
      - If marketer.status !== 'active': return 403 `{ error: 'marketer_inactive' }`
      - Set `marketerId = marketer.id`
      - Fetch assigned broker IDs: `const { data: assignments } = await supabase.from('marketer_brokers').select('broker_id').eq('marketer_id', marketer.id)`
      - `scopedBrokerIds = (assignments ?? []).map(a => a.broker_id)`
      - If `scopedBrokerIds.length === 0`: return 400 `{ error: 'no_brokers_assigned', message: 'Marketer has no brokers assigned' }`
    - In the lead insert (step 4), add `marketer_id: marketerId` to the insert object
    - In step 6 (assignment engine call), pass scopedBrokerIds: `assignment = await assignLead(lead.id, scopedBrokerIds)`
    - CRITICAL: If no Authorization header is present, the entire existing flow runs UNCHANGED. The `marketerId` stays null, `scopedBrokerIds` stays undefined, and `assignLead` gets no brokerIds filter.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit 2>&1 | head -30</automated>
    <manual>Review that the route.ts still handles the no-auth case identically to before</manual>
  </verify>
  <done>
    - Migration file exists with token column (unique, auto-generated mkt_ prefix) and marketer_id FK on leads
    - TypeScript types updated for both tables
    - createMarketer generates token in JS
    - fetchMarketers includes token in select
    - assignLead accepts optional brokerIds param and filters candidate orders
    - /api/leads/incoming checks Bearer token, looks up marketer, scopes routing
    - No-token requests flow through completely unchanged
  </done>
</task>

<task type="auto">
  <name>Task 2: Admin token column in marketers table + marketer dashboard token display</name>
  <files>
    src/components/marketers/marketers-table.tsx
    src/components/marketers/marketer-token-display.tsx
    src/app/(dashboard)/page.tsx
    src/lib/queries/marketers.ts
  </files>
  <action>
    **1. Update `src/components/marketers/marketers-table.tsx`:**
    - Add `token: string` to the `MarketerRow` type
    - Add a new "API Token" column header between "Phone" and "Status"
    - In the table body, render a truncated token (first 12 chars + "...") with a copy button next to it
    - Copy button: use a small ghost icon button with `Copy` icon from lucide-react
    - On click: `navigator.clipboard.writeText(marketer.token)` then `toast.success('Token copied')`
    - Style: `font-mono text-xs` for the token text

    **2. Create `src/components/marketers/marketer-token-display.tsx`:**
    - Client component ('use client')
    - Props: `{ token: string }`
    - Renders a card/section with heading "Your API Token"
    - Shows the full token in a monospace styled input (readonly) with a copy button
    - Copy button uses `navigator.clipboard.writeText(token)` + toast
    - Include a brief instruction: "Use this token as a Bearer token in the Authorization header when posting leads to the API."
    - Import from existing UI components: Card/CardHeader/CardContent or just a styled div, Button, toast from sonner, Copy + Check from lucide-react
    - After copy, briefly show a Check icon instead of Copy icon (useState toggle with setTimeout 2s)

    **3. Update `src/app/(dashboard)/page.tsx`:**
    - Import `getRole` and `getMarketerId` from `@/lib/auth/role` (getMarketerId already exists)
    - Import `MarketerTokenDisplay` from `@/components/marketers/marketer-token-display`
    - When `role === 'marketer'`, fetch the marketer's token using a new query function
    - Render `<MarketerTokenDisplay token={token} />` above the KPI cards, only when role is marketer and token exists

    **4. Add `fetchMarketerToken` to `src/lib/queries/marketers.ts`:**
    - New exported function: `async function fetchMarketerToken(marketerId: string): Promise<string | null>`
    - Queries `supabase.from('marketers').select('token').eq('id', marketerId).single()`
    - Returns `data?.token ?? null`
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit 2>&1 | head -30</automated>
    <manual>Check admin /marketers page shows token column. Check marketer dashboard overview shows token card.</manual>
  </verify>
  <done>
    - Marketers table shows truncated API token with copy button for each row
    - New MarketerTokenDisplay component renders full token with copy functionality
    - Marketer dashboard overview page shows "Your API Token" section when logged in as marketer
    - fetchMarketerToken query function exists and is used by the dashboard page
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- Migration SQL is syntactically valid
- No changes to existing routing behavior when no Authorization header is present
- assignLead signature is backward-compatible (brokerIds is optional)
</verification>

<success_criteria>
1. POST /api/leads/incoming without auth header routes globally (zero regression)
2. POST /api/leads/incoming with valid Bearer mkt_xxx token scopes to marketer's brokers
3. Invalid/inactive marketer tokens return appropriate error codes (401/403)
4. Marketer with no brokers assigned returns 400 error
5. leads.marketer_id is set for token-sourced leads, null for global leads
6. Admin sees token column with copy in marketers table
7. Marketer sees their API token on dashboard overview
8. TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/9-marketer-scoped-lead-routing-via-api-tok/9-SUMMARY.md`
</output>
