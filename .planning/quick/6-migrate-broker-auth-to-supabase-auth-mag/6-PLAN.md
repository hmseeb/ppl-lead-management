---
phase: quick-6
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/actions/magic-link.ts
  - src/app/portal/auth/callback/page.tsx
  - src/app/portal/auth/callback/actions.ts
  - src/app/portal/auth/verify/route.ts
autonomous: true
requirements: [AUTH-MIGRATE-01]
must_haves:
  truths:
    - "Broker enters email on login page and receives a Supabase Auth magic link email"
    - "Clicking magic link lands on callback page which exchanges code and creates iron-session"
    - "Broker is redirected to /portal with valid iron-session after clicking magic link"
    - "Admin invite button still sends magic link to broker"
    - "No calls to send-magic-link edge function remain in application code"
  artifacts:
    - path: "src/lib/actions/magic-link.ts"
      provides: "Supabase Auth OTP-based magic link sending"
      contains: "signInWithOtp"
    - path: "src/app/portal/auth/callback/page.tsx"
      provides: "Client-side auth code exchange"
      contains: "exchangeCodeForSession"
    - path: "src/app/portal/auth/callback/actions.ts"
      provides: "Server action to create iron-session from verified email"
      contains: "getBrokerSession\\|brokerSessionOptions"
  key_links:
    - from: "src/lib/actions/magic-link.ts"
      to: "supabase.auth.signInWithOtp"
      via: "admin client auth method"
      pattern: "signInWithOtp"
    - from: "src/app/portal/auth/callback/page.tsx"
      to: "src/app/portal/auth/callback/actions.ts"
      via: "server action call after code exchange"
      pattern: "createBrokerSession"
---

<objective>
Migrate broker portal authentication from custom magic_links table + GHL edge function to Supabase Auth magic links (OTP flow).

Purpose: Eliminate dependency on the send-magic-link Supabase edge function and GHL for email delivery. Use Supabase Auth's built-in magic link flow which sends via configured SMTP.

Output: Updated magic-link actions using Supabase Auth OTP, new callback page for auth code exchange, iron-session creation preserved.
</objective>

<execution_context>
@/Users/haseeb/.claude/get-shit-done/workflows/execute-plan.md
@/Users/haseeb/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/actions/magic-link.ts (current implementation to replace)
@src/app/portal/auth/verify/route.ts (old verify route to deprecate)
@src/app/portal/login/page.tsx (login page, no changes needed)
@src/lib/auth/broker-session.ts (iron-session config, keep as-is)
@src/lib/supabase/admin.ts (admin client for signInWithOtp)
@src/lib/supabase/client.ts (browser client for exchangeCodeForSession)
@src/components/brokers/broker-quick-actions.tsx (uses inviteBrokerToPortal, no changes needed)
@src/middleware.ts (middleware, no changes needed)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite magic-link actions to use Supabase Auth OTP</name>
  <files>src/lib/actions/magic-link.ts</files>
  <action>
Rewrite `src/lib/actions/magic-link.ts` to use Supabase Auth instead of custom magic_links table + edge function.

**`sendMagicLink(email: string)`:**
1. Keep the broker lookup by email (case-insensitive ilike query on brokers table) — still need to verify the email belongs to a broker before sending
2. If no broker found, return `{ error: 'no_broker' }` (same as before)
3. Replace the magic_links insert + functions.invoke with:
   ```ts
   const { error: otpError } = await supabase.auth.signInWithOtp({
     email: broker.email,
     options: {
       emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/portal/auth/callback`,
       shouldCreateUser: true,
     },
   })
   ```
4. If otpError, log it and return `{ error: 'email_failed' }`
5. Return `{ success: true }` on success
6. Remove the `crypto` import entirely
7. Remove all magic_links table operations (insert, select, update)
8. Remove the supabase.functions.invoke call

**`verifyMagicLink(token: string)`:**
- Keep the function but make it return `{ error: 'deprecated' }` with a console.warn. Do NOT delete it since the old verify route still imports it (will be handled in Task 2).

**`requestMagicLink(prevState, formData)`:**
- No changes needed. It already calls sendMagicLink which we're updating.

**`inviteBrokerToPortal(brokerId: string)`:**
- No changes needed. It already calls sendMagicLink which we're updating.

**Important:** Use the existing `createAdminClient()` from `@/lib/supabase/admin` — the service role key has permission to call `auth.signInWithOtp` server-side.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && grep -c "functions.invoke" src/lib/actions/magic-link.ts | grep "^0$" && grep -c "magic_links" src/lib/actions/magic-link.ts | grep "^0$" && grep -c "signInWithOtp" src/lib/actions/magic-link.ts | grep -v "^0$" && grep -c "crypto" src/lib/actions/magic-link.ts | grep "^0$" && echo "PASS"</automated>
    <manual>Verify the file has no references to edge function, no magic_links table ops, uses signInWithOtp, no crypto import</manual>
  </verify>
  <done>sendMagicLink uses supabase.auth.signInWithOtp instead of magic_links table + edge function. No calls to supabase.functions.invoke remain. verifyMagicLink returns deprecated error. requestMagicLink and inviteBrokerToPortal still work through updated sendMagicLink.</done>
</task>

<task type="auto">
  <name>Task 2: Create auth callback page and deprecate old verify route</name>
  <files>src/app/portal/auth/callback/page.tsx, src/app/portal/auth/callback/actions.ts, src/app/portal/auth/verify/route.ts</files>
  <action>
**Create `src/app/portal/auth/callback/actions.ts` (server action):**

```ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { brokerSessionOptions, BrokerSessionData } from '@/lib/auth/broker-session'

export async function createBrokerSessionFromEmail(email: string) {
  const supabase = createAdminClient()

  // Look up broker by verified email
  const { data: broker, error } = await supabase
    .from('brokers')
    .select('id')
    .ilike('email', email)
    .single()

  if (error || !broker) {
    return { error: 'no_broker' }
  }

  // Create iron-session
  const cookieStore = await cookies()
  const session = await getIronSession<BrokerSessionData>(cookieStore, brokerSessionOptions)
  session.isBroker = true
  session.brokerId = broker.id
  await session.save()

  return { success: true }
}
```

**Create `src/app/portal/auth/callback/page.tsx` (client component):**

This is a `'use client'` page that:
1. On mount (useEffect), creates a browser Supabase client using `createClient` from `@/lib/supabase/client`
2. Extracts the `code` from URL search params: `const code = searchParams.get('code')`
3. If code exists, calls `supabase.auth.exchangeCodeForSession(code)`
4. On success, gets the user email from the session: `data.session.user.email`
5. Calls the `createBrokerSessionFromEmail(email)` server action
6. On success, redirects to `/portal` via `router.push('/portal')`
7. On any error, redirects to `/portal/login?error=invalid_link`

Use `useSearchParams()` from `next/navigation` to get the code param. Use `useRouter()` for redirect.

Show a simple loading state while processing: centered spinner with "Verifying..." text. Use the same glass-card styling as the login page for consistency.

Handle edge cases:
- No code in URL -> redirect to login with error
- Code exchange fails -> redirect to login with error
- Broker lookup fails -> redirect to login with error (user has Supabase account but not a broker)

**Update `src/app/portal/auth/verify/route.ts`:**

Replace the entire file to redirect to login page. Old magic link tokens in emails won't work anymore, so redirect with a helpful error:

```ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Old magic link verify route - deprecated in favor of Supabase Auth callback
  return NextResponse.redirect(
    new URL('/portal/login?error=invalid_link', request.url)
  )
}
```

This gracefully handles any old magic link emails that might still be in inboxes.
  </action>
  <verify>
    <automated>cd /Users/haseeb/ppl-leadr-mgmt && test -f src/app/portal/auth/callback/page.tsx && test -f src/app/portal/auth/callback/actions.ts && grep -c "exchangeCodeForSession" src/app/portal/auth/callback/page.tsx | grep -v "^0$" && grep -c "createBrokerSessionFromEmail" src/app/portal/auth/callback/actions.ts | grep -v "^0$" && grep -c "deprecated\|Deprecated\|redirect" src/app/portal/auth/verify/route.ts | grep -v "^0$" && echo "PASS"</automated>
    <manual>Verify callback page exists with code exchange logic, server action creates iron-session, old verify route redirects</manual>
  </verify>
  <done>Callback page at /portal/auth/callback exchanges Supabase auth code for session, looks up broker by email, creates iron-session, and redirects to /portal. Old verify route gracefully redirects to login. Full auth flow: login form -> Supabase OTP email -> click link -> callback page -> iron-session -> portal.</done>
</task>

</tasks>

<verification>
Full flow verification (manual):
1. Go to /portal/login, enter a broker email, submit
2. Check that Supabase Auth sends the magic link email (not GHL)
3. Click the magic link in email
4. Verify redirect to /portal/auth/callback with code param
5. Verify automatic exchange and redirect to /portal with valid session
6. Verify old /portal/auth/verify?token=xxx redirects to login with error
7. Verify broker invite button in admin still works (sends Supabase Auth email)

Code verification:
- No references to `supabase.functions.invoke('send-magic-link')` in src/
- No new references to `magic_links` table in modified files
- `signInWithOtp` present in magic-link.ts
- `exchangeCodeForSession` present in callback page
- iron-session creation preserved in callback actions
</verification>

<success_criteria>
- Broker login sends magic link via Supabase Auth (not GHL edge function)
- Callback page exchanges auth code and creates iron-session
- Portal session works exactly as before (iron-session with brokerId)
- Middleware unchanged, no changes to other portal pages
- Old verify route gracefully handles stale magic link emails
- Admin invite button still works
</success_criteria>

<output>
After completion, create `.planning/quick/6-migrate-broker-auth-to-supabase-auth-mag/6-SUMMARY.md`
</output>
