# Pitfalls Research

**Domain:** Lead distribution and round-robin management (webhook-driven, Supabase + Next.js + Vercel)
**Researched:** 2026-03-12
**Confidence:** HIGH (Postgres concurrency patterns well-documented, Supabase/Vercel gotchas verified via official docs)

## Critical Pitfalls

### Pitfall 1: Double Lead Assignment from Concurrent Webhooks

**What goes wrong:**
Two webhooks arrive within milliseconds (GHL retry, duplicate submission, network replay). Both read the same broker as "next in rotation," both assign the lead, broker gets the same lead twice OR two different leads skip a broker entirely. The weighted rotation counter drifts from reality.

**Why it happens:**
The classic read-then-write race condition. Without atomic locking, the assignment function reads `leads_remaining` and rotation state, computes the next broker, then writes the assignment. Between read and write, another request does the same thing with the same stale state.

**How to avoid:**
Use `pg_advisory_xact_lock()` (transaction-scoped) to serialize all lead assignment operations. Wrap the entire match-assign-decrement flow in a single Postgres function that acquires a lock at the start. Use a single, well-known lock ID (e.g., `hashtext('lead_assignment')`) so ALL assignment operations serialize through one gate. The lock releases automatically on commit/rollback, no cleanup needed.

Additionally, add a UNIQUE constraint on `(lead_id, broker_id)` in the assignments table as a backstop. Even if the lock somehow fails, the database rejects the duplicate.

**Warning signs:**
- Two assignment records for the same lead
- `leads_remaining` going negative
- Broker complaints about duplicate leads
- Activity log showing two assignments within <100ms for the same lead

**Phase to address:**
Phase 1 (Database schema + assignment logic). This must be correct from day one. Retrofitting locking into existing assignment logic causes downtime.

---

### Pitfall 2: Synchronous Business Logic in the Webhook Endpoint

**What goes wrong:**
The inbound webhook handler from GHL does matching, assignment, rotation, AND outbound webhook firing all synchronously. GHL expects a 200 response quickly. If any step is slow (Supabase cold connection, outbound webhook to broker times out), the handler exceeds Vercel's timeout. GHL treats it as a failure. On the free tier, Vercel times out at 10 seconds. On Pro, 60 seconds. If the outbound broker webhook is slow, you burn the entire timeout budget.

Worse: GHL only retries on 429 status. A 5xx from your timeout is treated as a permanent failure. The lead is lost.

**Why it happens:**
Developers naturally write the full flow in one function: receive lead, match broker, assign, fire outbound webhook, return 200. It works perfectly in local dev where everything is fast. Production introduces network latency, cold starts, and slow downstream endpoints.

**How to avoid:**
Split into two phases:
1. **Webhook handler** (the Route Handler): Validate payload, store raw lead in `leads` table with status `pending`, return 200 immediately. This must complete in <2 seconds.
2. **Assignment processor**: Triggered by Supabase database trigger or a separate function that picks up `pending` leads. Runs the matching, assignment, rotation, and outbound webhook. Can take as long as needed.

Use Supabase's `pg_notify` or a database trigger on lead insert to kick off the assignment process. Alternatively, use `waitUntil()` in Next.js to extend the serverless function lifetime for the heavy processing after the 200 is returned.

**Warning signs:**
- Webhook response times >3 seconds in logs
- GHL showing "failed" webhook deliveries
- Leads appearing in GHL's sent log but not in your database
- Sporadic "function timed out" errors in Vercel

**Phase to address:**
Phase 1 (Webhook endpoint). The architecture decision to separate ingestion from processing must happen before any webhook code is written.

---

### Pitfall 3: Advisory Lock ID Collisions Causing Phantom Deadlocks

**What goes wrong:**
You hash a string or UUID to get the advisory lock ID, but two unrelated operations (e.g., lead assignment and webhook retry) accidentally hash to the same lock ID. They block each other despite being logically independent. Or worse, you use a simple integer that collides with Supabase's internal advisory lock usage (the auth system uses advisory locks internally, and GoTrueClient has had known deadlock issues with advisory lock acquisition).

**Why it happens:**
PostgreSQL advisory locks use either a single `bigint` or a pair of `(int, int)` as the key. If you use `hashtext('some_string')` which returns a 32-bit integer, collision probability grows with the number of distinct lock purposes. Supabase's own auth layer (GoTrue) also uses advisory locks, creating a shared namespace.

**How to avoid:**
Use the two-integer form: `pg_advisory_xact_lock(lock_namespace, lock_id)` where:
- `lock_namespace` is a constant identifying YOUR feature (e.g., `1` for lead assignment, `2` for webhook retry)
- `lock_id` is the resource-specific value

This avoids collisions with Supabase internals (which use the single-bigint form) and between your own features. Document your namespace registry in a migration comment.

For lead assignment specifically, use `pg_advisory_xact_lock(1, 0)` as a global assignment serializer. The lock ID doesn't need to be per-lead because you WANT to serialize ALL assignments (to maintain rotation order).

**Warning signs:**
- Assignment function occasionally hangs for exactly the Supabase statement timeout duration
- `pg_stat_activity` shows queries in `Lock` wait state that shouldn't be related
- Auth operations slowing down when lead volume is high
- Supabase dashboard showing elevated lock wait times

**Phase to address:**
Phase 1 (Database functions). Define the namespace convention in the first migration, before any advisory lock usage.

---

### Pitfall 4: Weighted Rotation State Drift Under Concurrent Load

**What goes wrong:**
The weighted rotation algorithm works by distributing leads proportionally to `leads_remaining`. Under concurrent load, multiple requests read the rotation state, compute the same "next broker," and both assign to that broker. Even with advisory locks preventing double-assignment, the rotation pointer advances incorrectly if the state update isn't atomic with the assignment.

A subtler bug: broker A has 100 leads remaining, broker B has 10. A gets a lead, decrementing to 99. But the decrement and rotation-pointer-advance happen in separate statements. Between them, another request reads stale state and assigns to broker A again when broker B should have been next.

**Why it happens:**
Weighted round-robin requires maintaining mutable shared state (who's next, how many remaining). Any gap between reading this state and updating it creates a window for inconsistency. Application-level rotation logic (in JavaScript) is especially vulnerable because the state round-trips through the network.

**How to avoid:**
Move the ENTIRE rotation logic into a single Postgres function. The function should:
1. Acquire advisory lock
2. Read all active orders with `leads_remaining > 0` matching the lead criteria
3. Compute weighted selection
4. Create assignment record
5. Decrement `leads_remaining`
6. If `leads_remaining` hits 0 and bonus mode is off, set order status to `completed`
7. Log the activity
8. Release lock (automatic on transaction commit)

ALL of this in one `SELECT assign_lead(lead_id)` call. No application-level state, no round trips, no gaps.

**Warning signs:**
- Distribution percentages don't match weight ratios over a sample of 100+ leads
- One broker consistently getting slightly more/fewer leads than their weight predicts
- `leads_remaining` occasionally jumping by 2 instead of decrementing by 1

**Phase to address:**
Phase 1 (Core assignment logic). The Postgres function must be the single source of truth for rotation from the start.

---

### Pitfall 5: Outbound Webhook Retry Storms Exhausting Database Connections

**What goes wrong:**
The pg_cron retry mechanism fires every N minutes for all failed webhooks simultaneously. If 50 webhooks failed during an outbound endpoint outage, all 50 retry at the exact same time. Each retry opens a database connection (to read the lead data and update the attempt count), plus fires an HTTP request via pg_net. pg_net handles max 200 requests/second, but more critically, pg_cron is limited to 32 concurrent jobs. If retries pile up, you saturate pg_cron, and your OTHER scheduled jobs (cleanup, stats) stop running.

**Why it happens:**
pg_cron doesn't have built-in jitter or rate limiting. A single cron job that processes all pending retries will try to do them all in one execution. If each retry includes an HTTP call via pg_net, you can overwhelm both the connection pool and the downstream endpoint (which might have just recovered from an outage).

**How to avoid:**
Design the retry cron job to process retries in batches with limits:
```sql
-- Process at most 10 retries per cron execution
SELECT process_webhook_retries(batch_size := 10);
```
Inside the function, select failed webhooks `ORDER BY next_retry_at ASC LIMIT 10` and add jitter to the `next_retry_at` calculation:
```sql
next_retry_at := now() + (interval '1 minute' * power(2, attempt_count))
                       + (random() * interval '30 seconds');
```
This gives exponential backoff WITH jitter AND batch-size limiting.

Also: set a max attempt count (3 as specified in PROJECT.md) and move permanently failed webhooks to a `failed` status visible in the dashboard. Do NOT keep retrying forever.

**Warning signs:**
- pg_cron job execution times spiking
- Database connection count near maximum after an outage recovery
- All retries happening at exactly the same second in logs
- pg_net errors about request limits

**Phase to address:**
Phase 2 (Outbound webhooks + retry mechanism). Must be designed with batching from the start.

---

### Pitfall 6: Supabase Connection Exhaustion on Vercel Serverless

**What goes wrong:**
Each Vercel serverless function invocation opens a new database connection. During a traffic spike (e.g., ad campaign launch sending 50 leads/minute), you exhaust Supabase's connection pool. New requests get `FATAL: too many connections` or `Max client connections reached`. Leads are dropped because the webhook handler can't even store them.

Known issue: Supabase's Supavisor pooler client connections can grow without releasing, even when database connections are stable. This has been observed specifically with Vercel's Fluid Compute + `attachDatabasePool`.

**Why it happens:**
Serverless functions are stateless by default. Each cold start creates a new connection. Even with Supavisor in transaction mode (port 6543), the client connections to the pooler itself can accumulate if idle timeout settings are misconfigured. The default Supabase free tier has limited connection slots.

**How to avoid:**
1. **Always connect via Supavisor in transaction mode** (port 6543, not 5432). This is non-negotiable for Vercel deployments.
2. If using a raw pg client (not the Supabase JS SDK), configure pool `max: 5` (not 1, not 50) and idle timeout of 5 seconds.
3. For the Supabase JS SDK (which you should prefer), the SDK handles connection management automatically through the REST API, avoiding the connection pool problem entirely for most operations.
4. Reserve direct Postgres connections for the advisory-lock-based assignment function only. Use the Supabase JS SDK for all dashboard reads.
5. Monitor `pg_stat_activity` weekly. Set up a Supabase alert for connection count > 80% of max.

**Warning signs:**
- Sporadic 500 errors on the dashboard that self-resolve in seconds
- "connection refused" or "too many connections" in Vercel function logs
- Supabase dashboard showing connection count near maximum
- Response times spiking during traffic bursts then normalizing

**Phase to address:**
Phase 1 (Initial setup + database configuration). Connection strategy must be decided before any database code is written.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Assignment logic in JS instead of Postgres function | Faster to develop, easier to debug | Race conditions, rotation drift, slower performance | Never. The core assignment MUST be in Postgres. |
| Skipping webhook idempotency | One less table, simpler handler | Duplicate assignments from GHL retries or network replays | Never. Add a `webhook_events` table with unique constraint on delivery ID from day one. |
| Using `setInterval` instead of pg_cron for retries | No pg_cron setup needed | Dies when Vercel function recycles, retries stop during deploys, no persistence | Never for production. Acceptable only in local dev. |
| Hardcoding broker GHL webhook URLs | Skip the broker profile management UI | Can't update URLs without code deploy, no audit trail | Only in Phase 1 prototype if UI is deferred. Migrate immediately. |
| Polling instead of Supabase Realtime | Simpler implementation, no subscription management | Wastes API calls, stale dashboard data, higher latency | Acceptable for MVP if Realtime setup is blocking. Replace in Phase 2. |
| Skipping activity log | Fewer tables, simpler writes | Zero visibility into why assignments happened, impossible to debug rotation bugs | Never. The activity log is how you debug the system. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GHL inbound webhook | Assuming the payload schema is stable and documented | Store the raw JSON payload in a `jsonb` column alongside parsed fields. GHL's payload structure can change without notice. Parse defensively with fallbacks. |
| GHL inbound webhook | Not handling the PATCH flow for AI call notes | The initial webhook and the follow-up update may arrive in any order. Design the lead record to accept partial data. Use `ghl_contact_id` as the stable identifier, not the webhook delivery ID. |
| GHL outbound (to broker) | Assuming the broker's GHL sub-account webhook is always available | Broker endpoints go down. Design for failure: queue the outbound, retry with backoff, surface failures in the dashboard. Never block assignment on outbound delivery success. |
| GHL outbound (to broker) | Sending the full lead record to the broker | Brokers' GHL sub-accounts expect a specific payload format. Map your lead data to their expected schema. Different brokers may need different field mappings in the future. |
| Supabase Realtime | Subscribing to entire tables without filters | Subscribe to specific filters (e.g., `status=eq.pending`). Unfiltered subscriptions receive every row change, which becomes noisy and expensive. The Pro plan charges $2.50 per million messages. |
| Supabase Realtime | Using Postgres Changes for high-frequency updates | Supabase docs explicitly recommend Broadcast over Postgres Changes for scalability. If the dashboard has >5 concurrent users watching the activity feed, Postgres Changes may bottleneck on database authorization speed. |
| Vercel deployment | Assuming environment variables update immediately | Vercel caches environment variables at build time for static pages. Use runtime environment variables (`process.env` in Route Handlers) for secrets. Redeploy after changing env vars. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unindexed `leads` table queries | Dashboard loads slowly, assignment function takes >1s | Add indexes on `status`, `created_at`, `ghl_contact_id`, `broker_id`. Add a composite index on `(vertical, credit_score)` for the matching query. | >10,000 leads |
| Storing all activity in one table without partitioning | Activity feed query scans millions of rows | Use `created_at` range queries with an index. Consider table partitioning by month after 1M records. For v1, a simple index is sufficient. | >500,000 activity records |
| N+1 queries in dashboard list views | Each lead row triggers a separate broker lookup | Use Supabase's `select('*, broker:brokers(*)')` to join in a single query. Or use Postgres views. | >100 rows per page |
| Advisory lock contention on every request | Assignment latency climbs from 50ms to 500ms+ | The lock should be held for <100ms (single Postgres function execution). If it's held longer, you have a slow query inside the lock. Profile the assignment function. | >10 concurrent assignments/second |
| Supabase Realtime message volume | $2.50/million messages adds up, possible throttling | Only broadcast meaningful events (assignment, status changes). Do NOT broadcast every field update. Use Realtime only for the dashboard, not for the assignment pipeline. | >100 events/minute sustained |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing `SUPABASE_SERVICE_ROLE_KEY` in client-side code | Full database access bypass, anyone can read/write/delete all data. Equivalent to root access. | Use service role key ONLY in Route Handlers (server-side). Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side. Verify with `grep -r SERVICE_ROLE` that it never appears in `/app` client components. |
| No webhook signature verification on inbound endpoint | Anyone who discovers your webhook URL can inject fake leads | GHL Custom Webhooks support a shared secret. Verify the signature in the Route Handler before processing. If GHL doesn't sign the specific webhook you're using, at minimum validate expected payload structure and add IP allowlisting via Vercel middleware. |
| Simple password auth with no rate limiting | Brute force attack on the admin password | Add rate limiting to the auth endpoint (e.g., 5 attempts per minute per IP). Use `@upstash/ratelimit` with Vercel KV, or a simple in-memory counter for v1. |
| Storing the admin password in plain text | Database breach exposes the password | Hash with bcrypt. Even though it's a single shared password, treat it like any other credential. Store the hash in an env var, not the database. |
| RLS policies not applied to new tables | New tables created without RLS are publicly accessible via the Supabase REST API | Enable RLS on EVERY table immediately after creation. Even for admin-only tables, add a policy that requires authentication. Use the service role key only in server-side Route Handlers. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback when webhook fails silently | Admin has no idea leads are being dropped. Brokers don't get leads, business owners wait forever. | Dashboard must show a prominent "failed webhooks" counter. Use a red badge/notification for any undelivered outbound webhooks. |
| Unassigned queue buried in navigation | Leads sit unassigned for hours because nobody checks the queue | Show unassigned count on the main dashboard KPI bar. Add a visual alert when count > 0. |
| No "why not matched" explanation | Admin can't fix matching problems because they don't know why leads went unassigned | Store the matching failure reason per lead: "no active orders for vertical: home_improvement", "no orders accepting credit_score < 620", etc. Display this in the unassigned queue. |
| Order status changes without confirmation | Admin accidentally completes/pauses an order with one click | Use a confirmation dialog for destructive actions (complete, pause). Inline actions are great for speed, but irreversible actions need a gate. |
| Activity log with no filtering | Admin scrolls endlessly to find a specific event | Default to last 24 hours. Filter by event type, broker, lead, date range. Search by lead name/email. |

## "Looks Done But Isn't" Checklist

- [ ] **Webhook handler:** Returns 200 but verify it handles malformed payloads gracefully (missing fields, extra fields, wrong types). GHL payloads are not always consistent.
- [ ] **Assignment logic:** Works for 1 lead but verify it handles 10 concurrent leads arriving within 1 second. Load test with parallel requests.
- [ ] **Weighted rotation:** Correct for 2 brokers but verify with 5+ brokers where some have 0 leads remaining. Edge case: all active orders exhausted simultaneously.
- [ ] **Order completion:** Decrements correctly but verify bonus mode toggle. What happens if bonus mode is turned ON after `leads_remaining` hits 0? The order should reactivate.
- [ ] **PATCH endpoint:** Updates existing leads but verify it handles PATCH arriving BEFORE the initial POST (AI call notes arriving before the lead webhook). Create the lead stub from the PATCH if it doesn't exist.
- [ ] **Outbound webhook retry:** Retries work but verify the retry counter resets per webhook event, not globally. Verify retries stop at max attempts.
- [ ] **Realtime subscriptions:** Dashboard updates live but verify it reconnects after network interruption. Supabase JS auto-reconnects, but your UI state may be stale after reconnection. Fetch fresh data on reconnect.
- [ ] **Unassigned queue:** Leads appear when unmatched, but verify manual assignment from the queue actually runs the full assignment flow (outbound webhook, activity log, counter update), not just a status change.
- [ ] **Dashboard KPIs:** Numbers look right but verify they use the same queries/logic as the detail views. A common bug: KPI counts and list counts disagree because they use different filters.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double lead assignment | MEDIUM | Query for duplicate assignments, identify the incorrect one, manually unassign, adjust `leads_remaining` counters, notify affected broker. Add the missing unique constraint. |
| Lost leads (webhook timeout) | HIGH | Cross-reference GHL's outbound log with your leads table. Re-send any missing leads via GHL's API or manual entry. Implement the async pattern to prevent recurrence. |
| Rotation drift | MEDIUM | Export all assignments, calculate what the distribution SHOULD have been, identify over/under-served brokers. Manually adjust `leads_remaining` to compensate. Fix the rotation function. |
| Connection exhaustion | LOW | Restart affected Vercel functions (redeploy), connections reset. Switch to Supavisor transaction mode. Long-term: configure proper pooling. |
| Stale dashboard after Realtime disconnect | LOW | Add a "last updated" timestamp to the dashboard. If stale >30 seconds, show a warning banner and auto-refresh. Implement reconnection handler in the Supabase client. |
| Outbound webhook failures piling up | MEDIUM | Manually review the failed queue in the dashboard. Fix the broker endpoint issue. Bulk-retry all failed webhooks. If leads are time-sensitive (>2 hours old), contact brokers directly. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Double lead assignment | Phase 1: Schema + assignment function | Load test with 10 concurrent POST requests to webhook endpoint. Verify exactly 10 distinct assignments. |
| Synchronous webhook handler | Phase 1: Webhook endpoint architecture | Measure webhook response time in Vercel logs. Must be <2 seconds for 99th percentile. |
| Advisory lock collisions | Phase 1: First database migration | Document namespace registry. grep codebase for advisory lock usage, verify no overlapping IDs. |
| Weighted rotation drift | Phase 1: Assignment Postgres function | Assign 100 test leads across 3 brokers with weights 50/30/20. Verify distribution is within 5% of expected. |
| Retry storms | Phase 2: Outbound webhook + retry system | Simulate 50 failed webhooks, verify retries are spread over time (not all at once). Check pg_cron job duration. |
| Connection exhaustion | Phase 1: Database configuration | Deploy to Vercel, send 20 concurrent requests, monitor Supabase connection count. Must stay below 80% of max. |
| Service role key exposure | Phase 1: Auth + environment setup | `grep -r SERVICE_ROLE` in the built output. Must only appear in server-side files. |
| No webhook idempotency | Phase 1: Webhook handler | Send the same webhook payload twice with the same delivery ID. Verify only one lead is created. |
| Unassigned queue invisible | Phase 2: Dashboard design | Verify unassigned count is visible on every dashboard page without navigation. |
| PATCH before POST ordering | Phase 1: Lead update endpoint | Send PATCH with `ghl_contact_id` before POST. Verify lead is created from PATCH data, then enriched by POST. |

## Sources

- [Supabase Advisory Locks Best Practice](https://supaexplorer.com/best-practices/supabase-postgres/lock-advisory/) - HIGH confidence
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) - HIGH confidence (official docs)
- [Supabase pg_cron Documentation](https://supabase.com/docs/guides/database/extensions/pg_cron) - HIGH confidence (official docs)
- [Supabase pg_net Documentation](https://supabase.com/docs/guides/database/extensions/pg_net) - HIGH confidence (official docs)
- [GoHighLevel Webhook Retries](https://help.gohighlevel.com/support/solutions/articles/155000007071-automated-webhook-retries) - HIGH confidence (official docs)
- [Supavisor Connection Growth Issue](https://github.com/orgs/supabase/discussions/40671) - MEDIUM confidence (community report, unresolved)
- [GoTrue Advisory Lock Deadlocks](https://github.com/supabase/supabase-js/issues/1594) - MEDIUM confidence (known issue)
- [Vercel Function Timeouts](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) - HIGH confidence (official docs)
- [Vercel Connection Pooling Guide](https://vercel.com/kb/guide/connection-pooling-with-functions) - HIGH confidence (official docs)
- [Webhook Idempotency Patterns](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency) - MEDIUM confidence (industry best practice)
- [Stop Doing Business Logic in Webhook Endpoints](https://dev.to/elvissautet/stop-doing-business-logic-in-webhook-endpoints-i-dont-care-what-your-lead-engineer-says-8o0) - MEDIUM confidence (well-argued community post)
- [Preventing Race Conditions in Supabase](https://github.com/orgs/supabase/discussions/30334) - MEDIUM confidence (community discussion)
- [PostgreSQL Advisory Locks Explained](https://flaviodelgrosso.com/blog/postgresql-advisory-locks) - MEDIUM confidence
- [Webhook Retry Best Practices - Hookdeck](https://hookdeck.com/outpost/guides/outbound-webhook-retry-best-practices) - MEDIUM confidence
- [Webhook Retry Best Practices - Svix](https://www.svix.com/resources/webhook-best-practices/retries/) - MEDIUM confidence
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - HIGH confidence (official docs)
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys) - HIGH confidence (official docs)

---
*Pitfalls research for: PPL Lead Management - lead distribution and round-robin management*
*Researched: 2026-03-12*
