---
phase: quick
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/callbacks/route.ts
autonomous: true
requirements: [QUICK-4]

must_haves:
  truths:
    - "GET /api/callbacks returns paginated callbacks with lead and broker names"
    - "Filters by lead_id, broker_id, status, and date range all work independently and combined"
    - "Missing or invalid filters return 400 with clear validation error"
    - "Default pagination returns first 50 results when no limit/offset provided"
  artifacts:
    - path: "src/app/api/callbacks/route.ts"
      provides: "GET handler alongside existing POST handler"
      exports: ["GET", "POST"]
  key_links:
    - from: "src/app/api/callbacks/route.ts"
      to: "callbacks table"
      via: "supabase admin client with joined lead/broker select"
      pattern: "supabase.*from.*callbacks"
---

<objective>
Add a GET handler to the existing /api/callbacks route that lists callbacks with optional filters and pagination, returning joined lead and broker names.

Purpose: Enable the dashboard and API consumers to query callbacks with flexible filtering.
Output: Updated route.ts with GET handler.
</objective>

<execution_context>
@/Users/haseeb/.claude/get-shit-done/workflows/execute-plan.md
@/Users/haseeb/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/callbacks/route.ts (existing POST handler -- add GET alongside it)
@src/lib/portal/queries.ts (reference pagination pattern: .range() with { count: 'exact' })
@supabase/migrations/00030_callbacks.sql (table schema)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add GET handler to /api/callbacks with filters and pagination</name>
  <files>src/app/api/callbacks/route.ts</files>
  <action>
Add a GET handler to the existing route file (keep the POST handler unchanged).

Query params (all optional):
- lead_id: uuid string, filter by exact match
- broker_id: uuid string, filter by exact match
- status: one of "pending", "completed", "cancelled"
- from: ISO datetime string, filter scheduled_time >= from
- to: ISO datetime string, filter scheduled_time <= to
- limit: integer, default 50, max 100
- offset: integer, default 0

Validation: Use zod with z.object and .safeParse on an object built from searchParams. Validate UUIDs with z.string().uuid().optional(), status with z.enum(['pending','completed','cancelled']).optional(), from/to with z.string().datetime().optional(), limit with z.coerce.number().int().min(1).max(100).default(50), offset with z.coerce.number().int().min(0).default(0). Return 400 with { error: 'validation_error', details } on failure.

Query construction:
1. Start with supabase.from('callbacks').select('id, lead_id, broker_id, scheduled_time, status, notes, created_at, updated_at, leads!inner(first_name, last_name), brokers!inner(first_name, last_name)', { count: 'exact' })
2. Chain .eq() for lead_id, broker_id, status when present
3. Chain .gte('scheduled_time', from) and .lte('scheduled_time', to) when present
4. Chain .order('scheduled_time', { ascending: false })
5. Chain .range(offset, offset + limit - 1)

Response shape: Map each row to flatten lead/broker names:
{
  id, lead_id, broker_id, scheduled_time, status, notes, created_at, updated_at,
  lead_name: [leads.first_name, leads.last_name].filter(Boolean).join(' ') || null,
  broker_name: [brokers.first_name, brokers.last_name].filter(Boolean).join(' ') || null,
}

Return: { data: [...callbacks], total: count, limit, offset } with status 200.
On DB error: return { error: 'db_error', message: error.message } with status 500.

IMPORTANT: The Supabase join syntax uses the FK relationship name. Since callbacks has lead_id -> leads(id) and broker_id -> brokers(id), the join names are "leads" and "brokers". The select returns them as nested objects (leads: { first_name, last_name }).
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && npx tsc --noEmit src/app/api/callbacks/route.ts</automated>
    <manual>curl "http://localhost:3000/api/callbacks" returns 200 with data array; curl "http://localhost:3000/api/callbacks?status=pending&limit=10" returns filtered results</manual>
  </verify>
  <done>GET /api/callbacks returns paginated callbacks with joined lead/broker names; all filters (lead_id, broker_id, status, from, to) work; defaults to limit=50, offset=0; invalid params return 400; existing POST handler unchanged.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- GET /api/callbacks with no params returns { data, total, limit: 50, offset: 0 }
- GET /api/callbacks?status=pending filters correctly
- GET /api/callbacks?from=2026-01-01T00:00:00Z&to=2026-12-31T23:59:59Z date range works
- GET /api/callbacks?limit=10&offset=20 pagination works
- GET /api/callbacks?status=invalid returns 400 validation error
- Existing POST /api/callbacks still works as before
</verification>

<success_criteria>
GET /api/callbacks endpoint returns paginated, filterable callback list with joined lead and broker display names. All five filter params work independently and combined. Response includes total count for pagination. Existing POST handler untouched.
</success_criteria>

<output>
After completion, create `.planning/quick/4-add-get-api-callbacks-endpoint-with-filt/4-SUMMARY.md`
</output>
