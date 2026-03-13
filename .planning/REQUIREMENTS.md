# Requirements: PPL Lead Management

**Defined:** 2026-03-13
**Core Value:** Leads are matched and delivered to the right broker within seconds of arriving, every time, with full audit trail of why each assignment was made.

## v2.0 Requirements

### Pre-flight Validation

- [ ] **VALID-01**: System rejects leads with credit_score < 600 (status = 'rejected', reason = 'credit_too_low')
- [ ] **VALID-02**: System rejects leads with missing or invalid loan_amount (<= 0) (status = 'rejected', reason = 'invalid_loan_amount')
- [ ] **VALID-03**: System rejects leads when no active orders exist (status = 'rejected', reason = 'no_active_orders')
- [ ] **VALID-04**: System deduplicates leads on email + phone combination (in addition to existing ghl_contact_id dedup)

### Scoring Engine

- [ ] **SCORE-01**: Assignment engine scores each eligible order 0-100 using: Credit Fit (40pts) + Capacity (30pts) + Tier Match (20pts) + Loan Fit (10pts) + Bonuses
- [ ] **SCORE-02**: Credit Fit calculated as (lead.credit_score - order.credit_score_min) / (850 - order.credit_score_min) * 40
- [ ] **SCORE-03**: Capacity calculated as (1 - fill_rate) * 30 where fill_rate = leads_delivered / total_leads
- [ ] **SCORE-04**: Tier Match awards 20pts for exact tier match (680+ lead to 680-min order, 600-679 lead to 600-min order), 10pts for fallback (680+ lead to 600-min order)
- [ ] **SCORE-05**: Loan Fit awards 10pts when lead.funding_amount falls within order.loan_min and order.loan_max
- [ ] **SCORE-06**: Priority bonus +8pts for orders with priority = 'high'
- [ ] **SCORE-07**: Urgency bonus +5pts when order fill_rate > 80%, penalty -5pts when fill_rate < 10%
- [ ] **SCORE-08**: Tie-breaker uses lowest fill_rate (most capacity remaining)

### Credit Tier Gating

- [ ] **TIER-01**: Orders with credit_score_min >= 680 NEVER receive leads with credit_score < 680 (hard filter)
- [ ] **TIER-02**: Orders with credit_score_min >= 600 accept any lead scoring 600+ including 680+
- [ ] **TIER-03**: 680+ leads route to 680-min orders first (20pts tier match), fall back to 600-min orders (10pts) only when no 680-min orders eligible

### Order Model Changes

- [ ] **ORDER-01**: Orders have loan_min and loan_max fields (integer, nullable) for loan amount range filtering
- [ ] **ORDER-02**: Orders have priority field (enum: high/normal, default normal)
- [ ] **ORDER-03**: Orders support monthly recurring type with auto-reset of leads_delivered on the 1st of each month
- [ ] **ORDER-04**: Order creation form includes loan range, priority, and order type (one-time/monthly) fields
- [ ] **ORDER-05**: Hard filter excludes orders where lead.funding_amount is outside loan_min/loan_max range

### Audit Trail

- [ ] **AUDIT-01**: Routing logs table records every order considered per lead (eligible, disqualify_reason, score_breakdown, selected)
- [ ] **AUDIT-02**: Lead status enum includes 'rejected' for pre-flight failures
- [ ] **AUDIT-03**: Routing log viewable on lead detail page showing all orders scored with breakdown
- [ ] **AUDIT-04**: Monthly cap reset logged in activity_log (order_id, reset_at, previous_delivered_count)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Broker-centric routing (remove orders) | Dan confirmed order-based architecture stays |
| State/geo-based matching | Deferred — all clients operate nationwide |
| HMAC webhook signatures (X-PPL-Signature) | Not needed for GHL delivery |
| Broker-level loan range / credit min | Lives on orders, not brokers |
| Scoring latency SLA (< 200ms) | Optimize later if needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VALID-01 | Phase 14 | Done |
| VALID-02 | Phase 14 | Done |
| VALID-03 | Phase 14 | Done |
| VALID-04 | Phase 14 | Done |
| SCORE-01 | Phase 15 | Done |
| SCORE-02 | Phase 15 | Done |
| SCORE-03 | Phase 15 | Done |
| SCORE-04 | Phase 15 | Done |
| SCORE-05 | Phase 15 | Done |
| SCORE-06 | Phase 15 | Done |
| SCORE-07 | Phase 15 | Done |
| SCORE-08 | Phase 15 | Done |
| TIER-01 | Phase 15 | Done |
| TIER-02 | Phase 15 | Done |
| TIER-03 | Phase 15 | Done |
| ORDER-01 | Phase 13 | Done |
| ORDER-02 | Phase 13 | Done |
| ORDER-03 | Phase 17 | Pending |
| ORDER-04 | Phase 13 | Done |
| ORDER-05 | Phase 15 | Done |
| AUDIT-01 | Phase 16 | Pending |
| AUDIT-02 | Phase 16 | Pending |
| AUDIT-03 | Phase 16 | Pending |
| AUDIT-04 | Phase 17 | Pending |

**Coverage:**
- v2.0 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation*
