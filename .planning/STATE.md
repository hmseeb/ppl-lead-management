# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail.
**Current focus:** Phase 1: Foundation + Assignment Engine

## Current Position

Phase: 1 of 5 (Foundation + Assignment Engine)
Plan: 3 of 3 in current phase
Status: Phase Complete
Last activity: 2026-03-12 — Completed 01-03-PLAN.md

Progress: [████░░░░░░] 21%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 10min
- Total execution time: 0.48 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 29min | 10min |

**Recent Trend:**
- Last 5 plans: 01-01 (15min), 01-02 (7min), 01-03 (7min)
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

### Pending Todos

None yet.

### Blockers/Concerns

- GHL webhook payload schema is not formally documented and may change. Store raw jsonb alongside parsed fields. Validate with real test webhook during Phase 2.

## Session Continuity

Last session: 2026-03-12
Stopped at: Completed 01-03-PLAN.md (Phase 1 complete)
Resume file: None
