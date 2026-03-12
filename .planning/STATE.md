# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail.
**Current focus:** Phase 3: Lead Delivery

## Current Position

Phase: 3 of 5 (Lead Delivery)
Plan: 1 of 2 in current phase
Status: In Progress
Last activity: 2026-03-12 — Completed 03-01-PLAN.md

Progress: [██████░░░░] 43%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 7min
- Total execution time: 0.63 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 29min | 10min |
| 02-webhook-ingestion | 2 | 7min | 4min |
| 03-lead-delivery | 1 | 2min | 2min |

**Recent Trend:**
- Last 5 plans: 01-03 (7min), 02-01 (3min), 02-02 (4min), 03-01 (2min)
- Trend: improving

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 5 phases following strict dependency chain (schema+engine -> webhooks -> delivery -> dashboard -> realtime)
- Research: Assignment engine must be a single Postgres function with advisory locks. No application-level rotation state.
- Research: Use Supavisor port 6543 from day one to prevent connection exhaustion on Vercel.
- Research: Pin zod to ~3.24.0 (v4 blocked by react-hook-form resolver issue).
- 01-01: Used assignment_status column instead of reusing existing brokers.status (which stores onboarding status)
- 01-01: Added anon SELECT policies on all tables for ppl-onboarding compatibility when enabling RLS
- 01-01: Used text CHECK constraints instead of enum types for status columns
- 01-02: Used native HTML select for broker dropdown (base-ui Select too complex for RHF integration)
- 01-02: Split name into first_name/last_name server-side to match existing brokers schema
- 01-02: Server Actions with Zod safeParse pattern established for all mutations
- 01-03: Used pg_advisory_xact_lock(1,0) two-integer form to avoid GoTrue lock collision
- 01-03: Weighted rotation: leads_remaining/total_leads DESC, last_assigned_at ASC NULLS FIRST
- 01-03: Used assignment_status (not status) for broker eligibility in assign_lead()
- 02-01: SELECT-first idempotency over upsert for ghl_contact_id duplicate detection
- 02-01: Graceful assignment errors: catch and return in response, never lose the lead
- 02-01: Empty string handling for email/phone via z.literal('') to handle GHL inconsistency
- 02-02: Inline Zod schema for PATCH (different from POST schema, self-contained per endpoint)
- 02-02: PROTECTED_FIELDS array explicitly blocks assignment columns from PATCH updates
- 03-01: Delivery payload is a jsonb snapshot of lead data at assignment time (not a reference)
- 03-01: delivery_id returned as null when broker has no crm_webhook_url (graceful skip)

### Pending Todos

None yet.

### Blockers/Concerns

- GHL webhook payload schema is not formally documented and may change. Store raw jsonb alongside parsed fields. Validate with real test webhook during Phase 2.

## Session Continuity

Last session: 2026-03-12
Stopped at: Completed 03-01-PLAN.md
Resume file: None
