---
phase: 22
name: Broker Auth
status: passed
verified_at: 2026-03-17
---

# Phase 22: Broker Auth Verification

## Goal
Brokers can securely access their portal via passwordless email login

## Success Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Broker enters email on /portal/login, receives magic link, clicks to authenticate | PASS | Login page at src/app/portal/login/page.tsx calls requestMagicLink, edge function sends GHL email, /portal/auth/verify validates token and creates session |
| 2 | Broker session persists across browser tabs and survives page refresh (iron-session with broker_id) | PASS | broker-session.ts uses iron-session with httpOnly cookie 'ppl-broker-session', stores brokerId |
| 3 | Unauthenticated requests to any /portal/* route redirect to /portal/login | PASS | (protected)/layout.tsx checks getBrokerSession, redirects if !isBroker. Middleware excludes portal from admin auth. |
| 4 | Admin can trigger magic link invite email from admin dashboard | PASS | broker-quick-actions.tsx has "Invite to Portal" button calling inviteBrokerToPortal action |

## Requirement Traceability

| Requirement | Plan | Status | Evidence |
|-------------|------|--------|----------|
| AUTH-01 | 22-01, 22-02 | PASS | Magic link flow: email form -> token generation -> GHL email -> verify route -> session |
| AUTH-02 | 22-01 | PASS | iron-session BrokerSessionData with brokerId, separate ppl-broker-session cookie |
| AUTH-03 | 22-02 | PASS | Route group (protected) layout with getBrokerSession check, middleware portal exclusion |
| AUTH-04 | 22-02 | PASS | inviteBrokerToPortal action + Invite to Portal button on broker detail page |

## Must-Have Artifacts

| Artifact | Exists | Verified |
|----------|--------|----------|
| supabase/migrations/00026_magic_links.sql | YES | CREATE TABLE magic_links with token, broker_id, expires_at, used, RLS enabled |
| src/lib/auth/broker-session.ts | YES | Exports getBrokerSession, brokerSessionOptions, BrokerSessionData |
| src/lib/actions/magic-link.ts | YES | Exports sendMagicLink, verifyMagicLink, requestMagicLink, inviteBrokerToPortal |
| supabase/functions/send-magic-link/index.ts | YES | Deno.serve edge function sending email via GHL API |
| src/app/portal/auth/verify/route.ts | YES | GET handler validating token, creating broker session |
| src/app/portal/login/page.tsx | YES | Client component with email form and magic link request |
| src/app/portal/(protected)/layout.tsx | YES | Auth guard layout checking broker session |
| src/app/portal/(protected)/page.tsx | YES | Placeholder portal home with broker info |
| src/middleware.ts | YES | Matcher includes 'portal' in exclusion list |
| src/components/brokers/broker-quick-actions.tsx | YES | Contains Invite to Portal button |

## Key Integration Points

| From | To | Via | Verified |
|------|----|-----|----------|
| magic-link.ts | magic_links table | supabase admin client insert | YES (pattern: from('magic_links').insert) |
| magic-link.ts | send-magic-link edge fn | supabase.functions.invoke | YES (pattern: functions.invoke('send-magic-link')) |
| verify/route.ts | broker-session.ts | getBrokerSession/getIronSession | YES (creates session with brokerId) |
| login/page.tsx | magic-link.ts | requestMagicLink server action | YES (useActionState) |
| broker-quick-actions.tsx | magic-link.ts | inviteBrokerToPortal import | YES |

## TypeScript Compilation
- `npx tsc --noEmit`: PASS (only pre-existing bun:test module errors)

## Deviations from Original Plan
- Used GHL email API instead of Resend (per instructions, GHL already integrated)
- No new API keys required

## Result: PASSED

All 4 success criteria met. All 4 requirements (AUTH-01 through AUTH-04) satisfied. All must-have artifacts exist with correct exports and patterns.
