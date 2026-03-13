---
phase: 15-scoring-engine-tier-gating
plan: 01
type: summary
status: complete
started: 2026-03-13
completed: 2026-03-13
---

## What was done

Built pure TypeScript scoring engine with TDD (30 tests, all passing).

### scoring.ts
- `scoreLead(lead, orders)` — applies hard filters, scores 0-100, sorts by score DESC + fill_rate ASC
- Hard filters: credit tier gating (TIER-01, TIER-02), loan range exclusion (ORDER-05), vertical match, capacity, active status
- Scoring: Credit Fit (40pts), Capacity (30pts), Tier Match (20pts), Loan Fit (10pts), Priority Bonus (+8), Urgency Bonus (+5/-5)
- Tie-breaker: lowest fill_rate wins (SCORE-08)
- Exports: `scoreLead`, `ScoreBreakdown`, `ScoredOrder`, `LeadForScoring`, `OrderForScoring`

### scoring.test.ts
- 30 tests covering all 12 requirements (SCORE-01 through SCORE-08, TIER-01/02/03, ORDER-05)

## Artifacts
- `src/lib/assignment/scoring.ts` — pure scoring function (no DB calls)
- `src/lib/assignment/scoring.test.ts` — comprehensive unit tests
