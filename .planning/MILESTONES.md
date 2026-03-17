# Milestones

## v1.0 MVP (Shipped: 2026-03-12)

**Phases completed:** 5 phases (1-5), 13 plans
**Git range:** Phases 1-5

**Key accomplishments:**
- Atomic lead assignment engine with advisory locks and fair rotation
- Webhook ingestion with PATCH update endpoint
- Multi-channel lead delivery (webhook, email, SMS) via GHL Conversations API
- Full admin dashboard with KPIs, data tables, unassigned queue, activity log
- Live dashboard updates via Supabase Realtime with theme toggle

---

## v1.1 Monitoring & Alerting (Shipped: 2026-03-13)

**Phases completed:** 4 phases (6-9), 6 plans
**Git range:** `2379ec9..ce23ec2` (33 files, +5,338 lines)
**Timeline:** Mar 12-13, 2026 (1 day, ~9 min execution)

**Key accomplishments:**
- Reusable send-alert edge function with type-discriminated SMS formatting via GHL
- Alert deduplication infrastructure (15-min window per broker/lead, weekly cleanup cron)
- Real-time DB triggers for delivery failures and unassigned leads (SECURITY DEFINER, WHEN clause filtering)
- Delivery stats dashboard with 7 KPI cards, channel health indicators, and debounced realtime refresh
- Daily digest via pg_cron (8 AM Pacific) with HTML email + SMS summary delivered through GHL

**Audit:** PASSED (14/14 requirements, 26/26 verification points, 11/11 cross-phase wires)

---

## v1.2 Broker Hours Enforcement (Shipped: 2026-03-13)

**Phases completed:** 3 phases (10-12), 4 plans
**Timeline:** Mar 13, 2026

**Key accomplishments:**
- Contact hours check before delivery (business_hours, custom, anytime)
- Weekend pause enforcement per broker
- Per-broker timezone support (default America/Los_Angeles)
- Queued delivery processing via pg_cron with FIFO release
- Admin visibility: queued deliveries KPI, broker detail contact hours card, queue activity logging

---

## v2.0 Smart Scoring Engine (Shipped: 2026-03-17)

**Phases completed:** 5 phases (13-17), 9 plans
**Git range:** `7d2d464..ba77647` (phases 13-17)
**Timeline:** Mar 13, 2026
**Codebase:** 12,179 LOC TypeScript across 226 files

**Key accomplishments:**
- Order model expansion: loan range (min/max), priority (high/normal), and monthly recurring type
- Pre-flight validation rejecting bad leads before scoring (credit < 600, invalid loan, no active orders)
- Lead deduplication on email + phone (in addition to existing ghl_contact_id)
- 0-100 scoring engine replacing weighted rotation (credit fit 40pts, capacity 30pts, tier match 20pts, loan fit 10pts, bonuses)
- Credit tier gating: 680-min orders hard-filtered from sub-680 leads
- Full routing audit trail with per-order score breakdowns on lead detail page
- Monthly recurring orders with auto-reset via pg_cron on the 1st

---

