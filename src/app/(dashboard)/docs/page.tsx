export const dynamic = 'force-dynamic'

import { getRole } from '@/lib/auth/role'

/* ─────────────────────────── shared components ─────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="rounded-lg bg-black/[0.04] dark:bg-white/[0.04] border border-red-500/10 p-4 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed text-foreground/80">
      {children}
    </pre>
  )
}

function FieldTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-red-500/10 text-left">
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Field</th>
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Type</th>
            <th className="pb-2 font-medium text-muted-foreground">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([field, type, notes]) => (
            <tr key={field} className="border-b border-red-500/5">
              <td className="py-2 pr-4 font-mono text-xs text-red-700 dark:text-red-400">{field}</td>
              <td className="py-2 pr-4 text-muted-foreground">{type}</td>
              <td className="py-2 text-foreground/80">{notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-3 text-sm text-foreground/80">
      {children}
    </div>
  )
}

/* ─────────────────────────── admin docs ─────────────────────────── */

function AdminDocs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documentation</h1>
        <p className="text-sm text-muted-foreground mt-1">Admin reference for the PPL Lead Management system.</p>
      </div>

      {/* Managing Marketers */}
      <Section title="Managing Marketers">
        <p className="text-sm text-foreground/80">
          Marketers are people who manage a subset of your brokers. They get a filtered dashboard showing only their assigned brokers&apos; data.
        </p>
        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">Adding a marketer:</p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Go to <span className="font-medium text-foreground">Marketers</span> in the sidebar.</li>
            <li>Click <span className="font-medium text-foreground">New Marketer</span>, fill in name, email, and phone.</li>
            <li>Click the <span className="font-medium text-foreground">Users icon</span> on their row to assign brokers.</li>
            <li>Click the <span className="font-medium text-foreground">Mail icon</span> to send them a magic-link login.</li>
          </ol>
        </div>
        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">What marketers can do:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>View leads, orders, activity, and calls for their brokers</li>
            <li>Reassign leads between their assigned brokers</li>
            <li>Send leads via their API token (scoped to their brokers)</li>
          </ul>
        </div>
        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">What marketers cannot do:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Create or edit orders</li>
            <li>Edit broker settings</li>
            <li>See data from unassigned brokers</li>
          </ul>
        </div>
        <Tip>Multiple marketers can share the same broker. Each marketer&apos;s stats only reflect their own assignments.</Tip>
      </Section>

      {/* Managing Brokers */}
      <Section title="Managing Brokers">
        <p className="text-sm text-foreground/80">
          Brokers receive leads through orders. Each broker can configure their own delivery methods and contact hours via the broker portal.
        </p>
        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">Key broker settings:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><span className="font-medium text-foreground">Delivery methods</span> - webhook URL, email, or SMS</li>
            <li><span className="font-medium text-foreground">Contact hours</span> - timezone, business hours, weekend pause</li>
            <li><span className="font-medium text-foreground">Assignment status</span> - active brokers receive leads, inactive ones are skipped</li>
          </ul>
        </div>
        <Tip>Leads arriving outside a broker&apos;s contact hours are queued and delivered when the window opens.</Tip>
      </Section>

      {/* Broker Onboarding Webhook */}
      <Section title="Broker Onboarding Webhook">
        <p className="text-sm text-foreground/80">
          Create brokers automatically from GHL via webhook. The broker gets an onboarding URL to complete their setup.
        </p>
        <Code>{`POST https://ppl-onboarding.vercel.app/api/webhooks/ghl
Content-Type: application/json

{
  "ghl_contact_id": "ghl_abc123",
  "first_name": "John",
  "last_name": "Smith",
  "email": "john@example.com",
  "phone": "+17025551234",
  "company_name": "Smith Funding LLC",
  "primary_vertical": "MCA",
  "secondary_vertical": "Equipment",
  "batch_size": 25,
  "deal_amount": 1500,
  "create_order": true
}`}</Code>
        <FieldTable rows={[
          ['ghl_contact_id', 'string', 'Required. Unique per broker, used for idempotency.'],
          ['first_name', 'string', 'Required. Auto title-cased.'],
          ['last_name', 'string', 'Required. Auto title-cased.'],
          ['email', 'string', 'Required. Valid email, auto lowercased.'],
          ['phone', 'string', 'Optional.'],
          ['company_name', 'string', 'Optional. Used for onboarding URL slug.'],
          ['primary_vertical', 'string', 'Optional. Pre-populated in onboarding if sent.'],
          ['secondary_vertical', 'string', 'Optional. Same options as primary.'],
          ['batch_size', 'number', 'Required. Number of referrals. Max 10,000.'],
          ['deal_amount', 'number', 'Required. Total deal amount in USD. Max 10,000,000.'],
          ['create_order', 'boolean', 'Optional (default false). Auto-creates an active lead order.'],
        ]} />
        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">Response:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><span className="font-medium">created</span> - new broker + onboarding URL returned</li>
            <li><span className="font-medium">exists</span> - broker already exists, returns existing onboarding URL (idempotent)</li>
            <li>If <code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">create_order: true</code>, an order is auto-created using batch_size and verticals</li>
          </ul>
        </div>
        <Tip>The onboarding URL is sent to the broker via your GHL workflow. They complete a 7-step setup flow including delivery preferences, contact hours, and policy acceptance.</Tip>
      </Section>

      {/* Lead Routing Engine */}
      <Section title="Lead Routing Engine">
        <p className="text-sm text-foreground/80">
          When a lead comes in, it passes through pre-flight validation, then the scoring engine assigns it to the best matching order.
        </p>

        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">Pre-flight checks (instant reject if failed):</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Credit score below 600 &rarr; rejected</li>
            <li>Missing or invalid funding amount &rarr; rejected</li>
            <li>No active orders in the system &rarr; rejected</li>
          </ul>
        </div>

        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">Deduplication (two layers):</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Exact match on <code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">ghl_contact_id</code></li>
            <li>Match on email + phone combo (case-insensitive)</li>
          </ul>
        </div>

        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">Hard filters per order:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Order must be active, broker must be active</li>
            <li>Order must have remaining capacity</li>
            <li>Vertical must match (or order accepts &quot;All&quot;)</li>
            <li>Credit score must meet order minimum</li>
            <li>Funding amount must fall within order&apos;s loan range</li>
          </ul>
        </div>

        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">Scoring breakdown (0-100 points):</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-red-500/10 text-left">
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Component</th>
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Max</th>
                <th className="pb-2 font-medium text-muted-foreground">How it works</th>
              </tr>
            </thead>
            <tbody className="text-foreground/80">
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium">Credit Fit</td>
                <td className="py-2 pr-4">40</td>
                <td className="py-2">How far above the order&apos;s minimum the lead&apos;s credit is</td>
              </tr>
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium">Capacity</td>
                <td className="py-2 pr-4">30</td>
                <td className="py-2">More remaining capacity = higher score</td>
              </tr>
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium">Tier Match</td>
                <td className="py-2 pr-4">20</td>
                <td className="py-2">20 for exact tier match, 10 for fallback</td>
              </tr>
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium">Loan Fit</td>
                <td className="py-2 pr-4">10</td>
                <td className="py-2">10 if funding amount is within order&apos;s range</td>
              </tr>
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium">Priority</td>
                <td className="py-2 pr-4">+8</td>
                <td className="py-2">Bonus for high-priority orders</td>
              </tr>
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium">Urgency</td>
                <td className="py-2 pr-4">&plusmn;5</td>
                <td className="py-2">+5 if fill &gt; 80%, -5 if fill &lt; 10%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Tip>Tiebreaker: the order with the lowest fill rate wins. Every scoring decision is logged in the routing audit trail on the lead detail page.</Tip>
      </Section>

      {/* Marketer-Scoped Routing */}
      <Section title="Marketer-Scoped Routing">
        <p className="text-sm text-foreground/80">
          When a marketer sends leads using their Bearer token, the scoring engine only considers orders belonging to that marketer&apos;s assigned brokers. The lead is tagged with the marketer&apos;s ID for attribution.
        </p>
        <Code>{`POST https://ppl-leadr-mgmt.vercel.app/api/leads/incoming
Authorization: Bearer <marketer_token>
Content-Type: application/json

{
  "ghl_contact_id": "ghl_123",
  "vertical": "MCA",
  "first_name": "Jane",
  "funding_amount": 35000,
  "credit_score": 700
}`}</Code>
        <div className="space-y-2 text-sm text-foreground/80">
          <p>If the token is invalid, you get a <code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">401</code>. If the marketer has no brokers assigned, you get a specific error. Otherwise, routing proceeds normally but scoped to the marketer&apos;s broker pool.</p>
        </div>
      </Section>

      {/* API Reference */}
      <Section title="API Reference">
        {/* POST https://ppl-leadr-mgmt.vercel.app/api/leads/incoming */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground font-mono">POST https://ppl-leadr-mgmt.vercel.app/api/leads/incoming</h3>
          <p className="text-sm text-foreground/80">
            Create a new lead and run it through the scoring engine. Accepts an optional <code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">Authorization: Bearer</code> header for marketer-scoped routing.
          </p>
          <FieldTable rows={[
            ['ghl_contact_id', 'string', 'Optional. Unique per lead, used for dedup. Either this or phone is required.'],
            ['vertical', 'string', 'e.g. "MCA", "SBA", "Equipment". Defaults to matching "All" orders.'],
            ['first_name', 'string', 'Optional.'],
            ['last_name', 'string', 'Optional.'],
            ['email', 'string', 'Valid email. Used for email+phone dedup.'],
            ['phone', 'string', 'Min 7 chars. Used for email+phone dedup.'],
            ['business_name', 'string', 'Optional.'],
            ['credit_score', 'number', '300-850. Auto-coerced from string. Below 600 is rejected.'],
            ['funding_amount', 'number', 'Recommended. Positive number. Missing = rejected.'],
            ['funding_purpose', 'string', 'Optional.'],
            ['state', 'string', 'US state code or full name.'],
            ['ai_call_notes', 'string', 'Notes from AI voice call.'],
            ['ai_call_status', 'string', 'e.g. "completed", "no_answer".'],
          ]} />
          <Code>{`curl -X POST https://ppl-leadr-mgmt.vercel.app/api/leads/incoming \\
  -H "Content-Type: application/json" \\
  -d '{
    "ghl_contact_id": "ghl_test_001",
    "vertical": "MCA",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "+15551234567",
    "credit_score": 680,
    "funding_amount": 35000,
    "state": "TX"
  }'`}</Code>

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Response statuses:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><span className="font-medium">assigned</span> - lead created and routed to a broker</li>
              <li><span className="font-medium">unassigned</span> - lead created but no matching order</li>
              <li><span className="font-medium">rejected</span> - failed pre-flight (credit too low, invalid loan amount)</li>
              <li><span className="font-medium">duplicate</span> - matching ghl_contact_id or email+phone already exists</li>
            </ul>
          </div>
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Sample responses:</p>
          </div>
          <Code>{`// assigned (includes broker contact for live transfer)
{
  "lead_id": "a1b2c3d4-...",
  "assignment": {
    "status": "assigned",
    "broker_id": "f5e6d7c8-...",
    "order_id": "b9a8c7d6-...",
    "delivery_ids": ["d1e2f3a4-..."],
    "delivery_status": "pending"
  },
  "broker": {
    "id": "f5e6d7c8-...",
    "name": "John Smith",
    "phone": "+15551234567",
    "ghl_contact_id": "ghl_broker_abc"
  }
}

// duplicate
{
  "lead_id": "a1b2c3d4-...",
  "status": "duplicate",
  "message": "lead already exists"
}

// rejected
{
  "lead_id": "a1b2c3d4-...",
  "status": "rejected",
  "reason": "credit_too_low"
}

// unassigned (no matching order, broker is null)
{
  "lead_id": "a1b2c3d4-...",
  "assignment": {
    "status": "unassigned",
    "reason": "no matching orders"
  },
  "broker": null
}`}</Code>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent my-4" />

        {/* PATCH https://ppl-leadr-mgmt.vercel.app/api/leads/update */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground font-mono">PATCH https://ppl-leadr-mgmt.vercel.app/api/leads/update</h3>
          <p className="text-sm text-foreground/80">
            Update an existing lead by <code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">ghl_contact_id</code>. Use this to push AI call results or updated info back from GHL.
          </p>
          <FieldTable rows={[
            ['ghl_contact_id', 'string', 'Required. Identifies which lead to update.'],
            ['first_name', 'string', 'Optional.'],
            ['last_name', 'string', 'Optional.'],
            ['email', 'string', 'Valid email or empty string.'],
            ['phone', 'string', 'Optional.'],
            ['business_name', 'string', 'Optional.'],
            ['vertical', 'string', 'Optional.'],
            ['credit_score', 'number', '300-850. Auto-coerced.'],
            ['funding_amount', 'number', 'Positive number. Auto-coerced.'],
            ['funding_purpose', 'string', 'Optional.'],
            ['state', 'string', 'Optional.'],
            ['ai_call_notes', 'string', 'Optional.'],
            ['ai_call_status', 'string', 'Optional.'],
          ]} />
          <Tip>Protected fields like assigned_broker_id, assigned_order_id, and status cannot be changed via this endpoint. They&apos;re managed by the assignment engine.</Tip>
          <Code>{`curl -X PATCH https://ppl-leadr-mgmt.vercel.app/api/leads/update \\
  -H "Content-Type: application/json" \\
  -d '{
    "ghl_contact_id": "ghl_test_001",
    "ai_call_status": "completed",
    "ai_call_notes": "Qualified. Wants $50k MCA."
  }'`}</Code>
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Sample responses:</p>
          </div>
          <Code>{`// 200 - success
{
  "lead_id": "a1b2c3d4-...",
  "updated_fields": ["ai_call_status", "ai_call_notes", "raw_payload"]
}

// 404 - lead not found
{
  "error": "lead_not_found",
  "ghl_contact_id": "ghl_test_001"
}`}</Code>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent my-4" />

        {/* GET https://ppl-leadr-mgmt.vercel.app/api/leads/lookup */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground font-mono">GET https://ppl-leadr-mgmt.vercel.app/api/leads/lookup</h3>
          <p className="text-sm text-foreground/80">
            Look up a lead by phone number. Returns assignment status and broker contact details if assigned.
          </p>
          <FieldTable rows={[
            ['phone', 'query param', 'Required. URL-encode the + as %2B.'],
          ]} />
          <Code>{`curl "https://ppl-leadr-mgmt.vercel.app/api/leads/lookup?phone=%2B15551234567"`}</Code>
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Responses:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><span className="font-medium">200</span> - lead found, includes broker details if assigned</li>
              <li><span className="font-medium">404</span> - no lead found with that phone number</li>
              <li><span className="font-medium">400</span> - missing phone parameter</li>
            </ul>
          </div>
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Sample responses:</p>
          </div>
          <Code>{`// 200 - assigned lead
{
  "lead_id": "a1b2c3d4-...",
  "lead_name": "Jane Doe",
  "status": "assigned",
  "assigned": true,
  "broker": {
    "id": "f5e6d7c8-...",
    "name": "John Smith",
    "email": "john@smithfunding.com",
    "phone": "+17025551234",
    "company": "Smith Funding LLC",
    "ghl_contact_id": "ghl_abc123",
    "availability": {
      "contact_hours": "custom",
      "timezone": "America/New_York",
      "weekend_pause": false,
      "custom_hours_start": "09:00",
      "custom_hours_end": "17:00"
    }
  }
}

// 200 - unassigned lead
{
  "lead_id": "a1b2c3d4-...",
  "lead_name": "Jane Doe",
  "status": "unassigned",
  "assigned": false,
  "broker": null
}

// 404
{
  "error": "not_found",
  "message": "no lead found with this phone number"
}`}</Code>
        </div>
      </Section>

      {/* Order Types */}
      <Section title="Order Types">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-red-500/10 text-left">
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Type</th>
                <th className="pb-2 font-medium text-muted-foreground">Behavior</th>
              </tr>
            </thead>
            <tbody className="text-foreground/80">
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium">one_time</td>
                <td className="py-2">Fixed allocation. Completes when leads_remaining hits 0.</td>
              </tr>
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium">monthly</td>
                <td className="py-2">Auto-resets on the 1st of each month. Delivered count resets to 0, capacity restores.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

/* ─────────────────────────── marketer docs ─────────────────────────── */

function MarketerDocs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documentation</h1>
        <p className="text-sm text-muted-foreground mt-1">Your guide to using the PPL Lead Management dashboard.</p>
      </div>

      {/* What You Can Do */}
      <Section title="What You Can Do">
        <p className="text-sm text-foreground/80">
          As a marketer, you see a filtered view of the dashboard showing only your assigned brokers&apos; data.
        </p>
        <div className="space-y-2 text-sm text-foreground/80">
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>View leads, orders, activity, and calls for your brokers</li>
            <li>Reassign leads between your assigned brokers</li>
            <li>Send leads via the API using your token</li>
            <li>Export data for your brokers</li>
          </ul>
        </div>
        <Tip>Your API token is available on the Settings page. Keep it secret, it grants full access to send leads to your broker pool.</Tip>
      </Section>

      {/* Sending Leads via API */}
      <Section title="Sending Leads via API">
        <p className="text-sm text-foreground/80">
          Use your API token as a Bearer token to send leads. The system will only route them to your assigned brokers.
        </p>
        <Code>{`curl -X POST https://ppl-leadr-mgmt.vercel.app/api/leads/incoming \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ghl_contact_id": "your_unique_id",
    "vertical": "MCA",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "+15551234567",
    "credit_score": 680,
    "funding_amount": 35000,
    "state": "TX"
  }'`}</Code>

        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">Required fields:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">ghl_contact_id</code> - a unique ID for each lead (used for dedup)</li>
          </ul>
        </div>
        <div className="space-y-2 text-sm text-foreground/80">
          <p className="font-medium text-foreground">Recommended fields:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">funding_amount</code> - leads without this are rejected</li>
            <li><code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">credit_score</code> - leads below 600 are rejected</li>
            <li><code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">vertical</code> - needed for order matching (e.g. &quot;MCA&quot;, &quot;SBA&quot;, &quot;Equipment&quot;)</li>
          </ul>
        </div>
      </Section>

      {/* Field Reference */}
      <Section title="Field Reference">
        <FieldTable rows={[
          ['ghl_contact_id', 'string', 'Required. Unique per lead.'],
          ['vertical', 'string', '"MCA", "SBA", "Equipment", etc.'],
          ['first_name', 'string', 'Optional.'],
          ['last_name', 'string', 'Optional.'],
          ['email', 'string', 'Valid email. Used for dedup with phone.'],
          ['phone', 'string', 'Min 7 chars. Used for dedup with email.'],
          ['business_name', 'string', 'Optional.'],
          ['credit_score', 'number', '300-850. Below 600 is rejected.'],
          ['funding_amount', 'number', 'Positive number. Missing = rejected.'],
          ['funding_purpose', 'string', 'Optional.'],
          ['state', 'string', 'US state code or full name.'],
          ['ai_call_notes', 'string', 'Notes from AI call.'],
          ['ai_call_status', 'string', '"completed", "no_answer", etc.'],
        ]} />
      </Section>

      {/* How Lead Assignment Works */}
      <Section title="How Lead Assignment Works">
        <p className="text-sm text-foreground/80">
          When you send a lead with your token, the scoring engine only considers orders from your assigned brokers. Here&apos;s the flow:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/80 pl-1">
          <li><span className="font-medium text-foreground">Pre-flight checks</span> - credit score, funding amount, and active orders are validated.</li>
          <li><span className="font-medium text-foreground">Dedup</span> - checked against existing leads by contact ID and email+phone.</li>
          <li><span className="font-medium text-foreground">Hard filters</span> - each order is checked for capacity, vertical match, credit tier, and loan range.</li>
          <li><span className="font-medium text-foreground">Scoring</span> - eligible orders are scored 0-100 based on credit fit, capacity, tier match, and loan fit.</li>
          <li><span className="font-medium text-foreground">Assignment</span> - the highest-scoring order wins. If tied, the order with most remaining capacity wins.</li>
        </ol>
        <Tip>If no order matches, the lead goes to the unassigned queue. You can manually assign it from the Leads page.</Tip>
      </Section>

      {/* Response Statuses */}
      <Section title="Response Statuses">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-red-500/10 text-left">
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                <th className="pb-2 font-medium text-muted-foreground">What it means</th>
              </tr>
            </thead>
            <tbody className="text-foreground/80">
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium text-foreground">assigned</td>
                <td className="py-2">Lead created and routed to one of your brokers.</td>
              </tr>
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium text-foreground">unassigned</td>
                <td className="py-2">Lead created but no matching order found.</td>
              </tr>
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium text-foreground">rejected</td>
                <td className="py-2">Failed pre-flight (credit too low, missing funding amount).</td>
              </tr>
              <tr className="border-b border-red-500/5">
                <td className="py-2 pr-4 font-medium text-foreground">duplicate</td>
                <td className="py-2">A lead with that contact ID or email+phone already exists.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Reassigning Leads */}
      <Section title="Reassigning Leads">
        <p className="text-sm text-foreground/80">
          You can move leads between your assigned brokers from the Leads page.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-foreground/80 pl-1">
          <li>Go to <span className="font-medium text-foreground">Leads</span> in the sidebar.</li>
          <li>Find the lead you want to move.</li>
          <li>Use the reassign action to pick a different broker from your pool.</li>
        </ol>
        <Tip>You can only reassign leads to brokers assigned to you. You won&apos;t see brokers outside your assignment.</Tip>
      </Section>
    </div>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default async function DocsPage() {
  const role = await getRole()

  if (role === 'marketer') {
    return <MarketerDocs />
  }

  return <AdminDocs />
}
