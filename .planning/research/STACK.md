# Technology Stack

**Project:** PPL Lead Management
**Researched:** 2026-03-12
**Overall confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.1.6 | Full-stack React framework | Ecosystem constraint (matches ppl-onboarding). Turbopack stable, Server Actions for mutations, `use cache` for fast navigation. Deployed on Vercel natively. | HIGH |
| React | 19.x | UI library | Required by Next.js 16. Server Components for zero-JS dashboard shells, `useOptimistic` for instant UI feedback on lead assignment. | HIGH |
| TypeScript | 5.x | Type safety | Non-negotiable for a system where data integrity matters. Catches schema mismatches between webhook payloads and DB types at compile time. | HIGH |

### Database & Backend Services

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase (hosted Postgres) | Latest | Database, auth, realtime, edge functions | Ecosystem constraint. Postgres is the right DB for transactional lead assignment with advisory locks. Supabase adds realtime subscriptions, pg_cron, pg_net, and pgmq on top. | HIGH |
| @supabase/supabase-js | 2.99.x | JS client for Supabase | Official SDK. Covers DB queries, realtime subscriptions, auth, and edge function invocation. Actively maintained (published days ago). | HIGH |
| @supabase/ssr | 0.9.x | Server-side Supabase client | Replaces deprecated auth-helpers. Creates server/browser clients with cookie-based session handling. Required for Next.js App Router server components. | HIGH |

### Key Postgres Extensions (Supabase-managed)

| Extension | Purpose | Why | Confidence |
|-----------|---------|-----|------------|
| pg_cron (1.6.4) | Scheduled jobs | Drives webhook retry polling. Runs a cron job every 30-60 seconds to process the retry queue. Max 8 concurrent jobs recommended, which is plenty. | HIGH |
| pg_net | Async HTTP from Postgres | Fires outbound webhooks to broker GHL sub-accounts directly from Postgres functions. Non-blocking (async), so it won't stall the assignment transaction. Handles up to 200 req/s. | HIGH |
| pgmq (Supabase Queues) | Message queue | Better than raw retry tables. Use for webhook delivery queue with guaranteed delivery, visibility timeouts, and exactly-once semantics. Failed webhooks stay in queue for retry automatically. | MEDIUM |
| Advisory locks (built-in) | Race condition prevention | `pg_advisory_xact_lock` for transaction-scoped locks during lead assignment. Prevents two concurrent webhooks from double-assigning the same lead. Zero table contention unlike `SELECT FOR UPDATE`. | HIGH |

### Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | Latest | Hosting & deployment | Ecosystem constraint. Serverless functions for webhook endpoints, edge network for dashboard. Automatic preview deployments for PR review. | HIGH |
| Tailwind CSS | 4.x | Utility-first CSS | ShadCN dependency. CSS-first config in v4 (no tailwind.config.js). Pairs with tw-animate-css for animations. | HIGH |

### UI Component Libraries

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| shadcn/ui | Latest (CLI v4) | Component library | Ecosystem constraint. Copy-paste components, not a dependency. Tailwind v4 compatible. Built on Radix UI primitives for accessibility. | HIGH |
| @tanstack/react-table | 8.21.x | Data tables | ShadCN's data table component is built on this. Headless, so full control over rendering. Server-side sorting, filtering, pagination. Powers the leads, brokers, orders, and unassigned queue tables. | HIGH |
| recharts | 3.8.x | Charts & KPIs | ShadCN's chart components use Recharts under the hood. No abstraction lock-in. Used for dashboard KPI visualizations (lead volume, distribution, broker performance). | HIGH |
| lucide-react | 0.577.x | Icons | ShadCN's default icon library. 1500+ icons, tree-shakeable, actively maintained. | HIGH |
| sonner | 2.0.x | Toast notifications | ShadCN's recommended toast component. Zero-config, works with Server Actions. "Lead assigned to Broker X" confirmations, webhook failure alerts. | HIGH |

### Form & Validation

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| zod | 3.24.x (NOT v4) | Schema validation | Shared schemas between client forms, server actions, and webhook payload validation. Use v3, not v4. v4 has known compatibility issues with react-hook-form resolvers that are still being ironed out. Safer choice. | HIGH |
| react-hook-form | 7.71.x | Form state management | ShadCN's form component is built on this. Minimal re-renders, great DX. Used for broker profiles, order creation, manual assignment forms. | HIGH |
| @hookform/resolvers | 5.2.x | Zod-to-RHF bridge | Connects zod schemas to react-hook-form. Use with zod v3 for stable types. | HIGH |

### State & Data Management

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| nuqs | 2.8.x | URL state management | Syncs filter/sort/search state to URL query params. Shareable filtered views ("show me all unassigned leads from last week"). Used by Vercel, Supabase, Sentry. Built-in debouncing prevents browser rate-limiting on rapid filter changes. | HIGH |
| date-fns | 4.1.x | Date manipulation | Tree-shakeable, immutable. For formatting timestamps in activity logs, calculating time-since-assignment, order date displays. Lighter than moment/luxon. | MEDIUM |

### Development Tools

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| Supabase CLI | Latest | Local development | Local Postgres + edge functions + realtime for dev. `supabase db diff` generates migrations. Critical for testing advisory locks and pg_cron locally. | HIGH |
| @faker-js/faker | Latest | Seed data | Generate realistic test leads, brokers, orders for development. Removes the "test with real data" antipattern. | MEDIUM |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Validation | zod v3 | zod v4 | v4 has active compatibility bugs with @hookform/resolvers. v3 is battle-tested and fully compatible. Upgrade later when ecosystem catches up. |
| Charts | recharts (via ShadCN) | tremor | Tremor is built ON recharts. Extra abstraction layer with less customization. ShadCN charts give you recharts directly with nice defaults. |
| Toast | sonner | react-hot-toast | Sonner is ShadCN's default, better accessibility, swipe-to-dismiss. |
| URL state | nuqs | manual useSearchParams | nuqs handles debouncing, type safety, SSR cache. Manual approach is error-prone and verbose. |
| Data tables | @tanstack/react-table | AG Grid, MUI DataGrid | TanStack Table is headless (matches ShadCN philosophy). AG Grid and MUI are heavy, opinionated, and visually incompatible with ShadCN. |
| Date library | date-fns | dayjs, luxon | Tree-shakeable (import only what you use). dayjs is smaller but less ergonomic. luxon is heavy. |
| Webhook retry | pgmq (Supabase Queues) + pg_cron | Raw retry table + pg_cron | pgmq gives guaranteed delivery, visibility timeouts, and exactly-once semantics for free. A raw table requires reimplementing queue semantics (visibility, dead-letter, retry count) from scratch. |
| Async HTTP | pg_net | Edge Function fetch | pg_net fires from inside the Postgres transaction. No extra hop to an edge function for simple webhook POSTs. Lower latency, fewer moving parts. |
| Auth | Simple cookie session | Supabase Auth, NextAuth | Project spec says simple password + session cookie. No user registration, no OAuth, no MFA. Supabase Auth is overkill. A middleware check against an env var is all you need. |
| Icons | lucide-react | heroicons, react-icons | lucide is ShadCN's default. Consistent design language. react-icons bundles everything (bloat). |

## Architecture Decisions Driven by Stack

### Webhook Delivery Pipeline (pg_net + pgmq + pg_cron)

This is the most critical stack decision. The pattern:

1. **Lead arrives** via POST to Next.js API route
2. **Assignment function** runs in Postgres (advisory lock, weighted rotation, insert assignment)
3. **pg_net fires** outbound webhook to broker's GHL immediately (non-blocking)
4. **On pg_net failure**, message goes to pgmq queue with retry metadata
5. **pg_cron job** (every 30s) reads from pgmq, retries failed webhooks via pg_net
6. **After 3 failures**, mark as failed in dashboard

This keeps the hot path (steps 1-3) entirely in Postgres. Sub-second assignment.

### Simple Auth (Cookie + Middleware)

The project explicitly scopes auth to "single shared password." The stack decision:

- Store hashed password in env var
- Login form posts to server action, sets HttpOnly cookie
- Next.js middleware checks cookie on protected routes
- No Supabase Auth, no NextAuth, no JWT complexity

### Realtime Dashboard (Supabase Realtime)

- Client components subscribe to `postgres_changes` channels
- Filter by table: leads, assignments, webhook_deliveries
- `supabase.channel('dashboard').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, callback)`
- Automatic reconnection handled by SDK

## Installation

```bash
# Core framework
bun add next@16.1.6 react@19 react-dom@19

# Supabase
bun add @supabase/supabase-js @supabase/ssr

# Forms & validation
bun add react-hook-form @hookform/resolvers zod@3

# Data & state
bun add @tanstack/react-table nuqs date-fns

# Charts
bun add recharts

# UI utilities
bun add sonner lucide-react

# Tailwind & animation
bun add -D tailwindcss@4 tw-animate-css

# Dev tools
bun add -D @faker-js/faker supabase typescript @types/react @types/react-dom
```

Then initialize ShadCN:

```bash
bunx shadcn@latest init
```

Add the specific ShadCN components needed:

```bash
bunx shadcn@latest add button card dialog dropdown-menu form input label select table tabs badge separator sheet toast chart
```

## Version Pinning Strategy

Pin major.minor, allow patch updates:

```json
{
  "next": "~16.1.6",
  "react": "^19.0.0",
  "@supabase/supabase-js": "^2.99.0",
  "@supabase/ssr": "^0.9.0",
  "zod": "~3.24.0",
  "react-hook-form": "^7.71.0",
  "@hookform/resolvers": "^5.2.0",
  "@tanstack/react-table": "^8.21.0",
  "nuqs": "^2.8.0",
  "recharts": "^3.8.0",
  "date-fns": "^4.1.0",
  "sonner": "^2.0.0",
  "lucide-react": "^0.577.0"
}
```

**Critical:** Do NOT upgrade zod to v4 until @hookform/resolvers has stable v4 support without type inference issues. Track this issue: https://github.com/react-hook-form/resolvers/issues/813

## Sources

- Next.js 16 release blog: https://nextjs.org/blog/next-16 (HIGH confidence)
- Next.js 16.1 release: https://nextjs.org/blog/next-16-1 (HIGH confidence)
- Supabase Cron docs: https://supabase.com/docs/guides/cron (HIGH confidence)
- Supabase pg_net docs: https://supabase.com/docs/guides/database/extensions/pg_net (HIGH confidence)
- Supabase Queues docs: https://supabase.com/docs/guides/queues (HIGH confidence)
- Supabase Queues + Edge Functions: https://supabase.com/docs/guides/queues/consuming-messages-with-edge-functions (HIGH confidence)
- Supabase Realtime postgres_changes: https://supabase.com/docs/guides/realtime/postgres-changes (HIGH confidence)
- Supabase SSR package: https://supabase.com/docs/guides/auth/server-side/creating-a-client (HIGH confidence)
- PostgreSQL advisory locks: https://www.postgresql.org/docs/current/explicit-locking.html (HIGH confidence)
- ShadCN data table: https://ui.shadcn.com/docs/components/radix/data-table (HIGH confidence)
- ShadCN charts: https://ui.shadcn.com/docs/components/radix/chart (HIGH confidence)
- ShadCN Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4 (HIGH confidence)
- TanStack Table: https://tanstack.com/table/latest (HIGH confidence)
- nuqs: https://nuqs.dev/ (HIGH confidence)
- Sonner: https://github.com/emilkowalski/sonner (HIGH confidence)
- Zod v4 + RHF issues: https://github.com/react-hook-form/resolvers/issues/813 (HIGH confidence)
- tablecn (ShadCN server-side table): https://github.com/sadmann7/tablecn (MEDIUM confidence)
- OpenStatus data-table-filters: https://data-table.openstatus.dev/ (MEDIUM confidence)
