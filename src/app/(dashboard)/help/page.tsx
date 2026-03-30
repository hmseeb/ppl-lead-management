export const dynamic = 'force-dynamic'

import { HelpCircle } from 'lucide-react'
import { getRole } from '@/lib/auth/role'

/* ─────────────────────────── shared components ─────────────────────────── */

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="glass-card rounded-2xl p-6 space-y-4">
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

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-3 text-sm text-foreground/80">
      {children}
    </div>
  )
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal list-inside space-y-1 text-sm text-foreground/80 pl-1">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  )
}

function BulletList({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 pl-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-red-500/10 text-left">
            {headers.map((h) => (
              <th key={h} className="pb-2 pr-4 font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-foreground/80">
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-red-500/5">
              {row.map((cell, j) => (
                <td key={j} className={`py-2 pr-4 ${j === 0 ? 'font-medium text-foreground' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent" />
}

/* ─────────────────────────── table of contents ─────────────────────────── */

const tocItems = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'managing-leads', label: 'Managing Leads' },
  { id: 'managing-brokers', label: 'Managing Brokers' },
  { id: 'managing-orders', label: 'Managing Orders' },
  { id: 'call-reporting', label: 'Call Reporting' },
  { id: 'marketers', label: 'Marketers' },
  { id: 'alerts-monitoring', label: 'Alerts & Monitoring' },
  { id: 'settings', label: 'Settings' },
  { id: 'scoring-engine', label: 'Scoring Engine' },
]

/* ─────────────────────────── admin help ─────────────────────────── */

function AdminHelp() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center">
          <HelpCircle className="size-5 text-red-700 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Admin Manual</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Everything you need to run BadAAAS / QuietFunding lead operations.
          </p>
        </div>
      </div>

      {/* Table of Contents */}
      <nav className="glass-card rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Quick Navigation</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tocItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-sm text-foreground/70 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ──────────── Getting Started ──────────── */}
      <Section title="Getting Started" id="getting-started">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Logging in</p>
            <p>
              Navigate to the login page and enter the admin password. There are no usernames.
              Admin access uses a single shared password set via the environment variable.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Dashboard overview</p>
            <p>The main dashboard shows KPIs for your selected date range:</p>
          </div>
          <SimpleTable
            headers={['KPI', 'What it means']}
            rows={[
              ['Total Leads', 'All leads received in the period (assigned + unassigned + rejected).'],
              ['Assigned', 'Leads successfully matched to a broker order.'],
              ['Unassigned', 'Leads that came in but had no matching order. Sitting in queue.'],
              ['Rejected', 'Leads that failed pre-flight checks (credit too low, missing funding amount).'],
              ['Revenue', 'Sum of lead prices for assigned leads in the period.'],
              ['Avg Score', 'Average routing score across all assigned leads.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Date range filters</p>
            <BulletList items={[
              'Use the date picker at the top to filter all dashboard data by time range.',
              'Toggle comparison mode to see period-over-period changes (e.g. this week vs. last week).',
              'Date filters apply globally across the Overview, Leads, Orders, and Activity pages.',
            ]} />
          </div>
        </div>
      </Section>

      {/* ──────────── Managing Leads ──────────── */}
      <Section title="Managing Leads" id="managing-leads">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">How leads arrive</p>
            <StepList steps={[
              'A lead comes in via the GHL webhook or the API endpoint.',
              'Pre-flight validation runs (credit score, funding amount, active orders).',
              'Deduplication checks against existing leads.',
              'The scoring engine evaluates all eligible orders and picks the best match.',
              'The lead is delivered to the winning broker via their configured method (webhook, email, or SMS).',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Lead statuses</p>
          </div>
          <SimpleTable
            headers={['Status', 'Meaning']}
            rows={[
              ['Assigned', 'Matched to a broker order and delivered (or pending delivery).'],
              ['Unassigned', 'No matching order found. Sitting in the unassigned queue for manual routing.'],
              ['Rejected', 'Failed pre-flight checks. Will not be assigned.'],
              ['Duplicate', 'Already exists in the system. Blocked at intake.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Viewing lead details</p>
            <p>
              Click any lead row to open the detail view. You will see contact info, credit score,
              funding amount, vertical, and the full routing audit trail showing which orders were
              considered, their scores, and why the winning order was selected.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Manual reassignment</p>
            <p>
              Go to the <span className="font-medium text-foreground">Unassigned</span> page in the sidebar.
              Select a lead and pick a broker/order to assign it to. This bypasses the scoring engine.
              Useful when a lead had no match but a broker wants it anyway.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Deduplication</p>
            <BulletList items={[
              <>Exact match on <code className="text-xs font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded">ghl_contact_id</code> blocks the lead immediately.</>,
              'Email + phone combo match (case-insensitive) also blocks as duplicate.',
              'Duplicates are logged but never assigned or delivered.',
            ]} />
          </div>
        </div>
      </Section>

      {/* ──────────── Managing Brokers ──────────── */}
      <Section title="Managing Brokers" id="managing-brokers">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Adding a new broker</p>
            <StepList steps={[
              'Go to Brokers in the sidebar.',
              'Click New Broker.',
              'Fill in name, email, phone, and company name.',
              'Save. The broker is created in paused status by default.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Editing broker details</p>
            <p>
              Click a broker row to open their profile. You can update name, email, phone,
              company, and all delivery settings from this view.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Delivery methods</p>
          </div>
          <SimpleTable
            headers={['Method', 'How it works']}
            rows={[
              ['Webhook', 'Lead data is POSTed to the broker\'s configured URL as JSON.'],
              ['Email', 'Lead details are sent to the broker\'s email address.'],
              ['SMS', 'A text message with lead summary is sent to the broker\'s phone.'],
            ]}
          />
          <Tip>Brokers can configure multiple delivery methods. All active methods fire simultaneously when a lead is assigned.</Tip>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Contact hours and weekend pause</p>
            <BulletList items={[
              'Each broker sets their timezone and business hours.',
              'Leads arriving outside contact hours are queued and delivered when the window opens.',
              'Weekend pause stops all deliveries on Saturday and Sunday if enabled.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Magic link invites</p>
            <p>
              Click the mail icon on a broker row to send them a magic link. This gives them
              access to the broker portal where they can manage their own delivery settings,
              contact hours, and view their leads.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Assignment status</p>
          </div>
          <SimpleTable
            headers={['Status', 'Effect']}
            rows={[
              ['Active', 'Broker receives leads through their orders. Included in scoring.'],
              ['Paused', 'Broker is skipped during scoring. No new leads delivered. Existing leads are unaffected.'],
            ]}
          />
        </div>
      </Section>

      {/* ──────────── Managing Orders ──────────── */}
      <Section title="Managing Orders" id="managing-orders">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Creating an order</p>
            <StepList steps={[
              'Go to Orders in the sidebar.',
              'Click New Order.',
              'Select a broker, vertical (MCA, SBA, Equipment, etc.), credit score minimum, lead count, and loan range.',
              'Choose order type (one-time or monthly) and priority level.',
              'Save. The order starts as active immediately.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Order types</p>
          </div>
          <SimpleTable
            headers={['Type', 'Behavior']}
            rows={[
              ['One-time', 'Fixed allocation. Completes automatically when leads_remaining hits 0.'],
              ['Monthly', 'Auto-resets on the 1st of each month. Delivered count resets to 0, capacity restores to full.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Bonus mode</p>
            <p>
              When enabled, the order continues accepting leads after the lead count is reached.
              Useful for brokers who want overflow leads at no extra cost.
              The order stays active instead of auto-completing.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Priority levels</p>
          </div>
          <SimpleTable
            headers={['Level', 'Effect']}
            rows={[
              ['High', 'Gets a +8 scoring bonus. These orders are strongly preferred by the routing engine.'],
              ['Normal', 'Standard scoring. No bonus or penalty.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Order lifecycle</p>
            <BulletList items={[
              <><span className="font-medium text-foreground">Pause</span> - temporarily removes the order from scoring. No leads assigned while paused.</>,
              <><span className="font-medium text-foreground">Resume</span> - reactivates a paused order. It rejoins the scoring pool immediately.</>,
              <><span className="font-medium text-foreground">Complete</span> - marks the order as done. Cannot be undone. Use pause if you just want a break.</>,
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Auto-reassignment</p>
            <p>
              When a paused order is resumed or a new order is created, the system checks the
              unassigned queue for leads that now match. Matching leads are automatically
              assigned to the newly available order.
            </p>
          </div>
          <Tip>Credit tier gating is strict: an order with a 680+ minimum will never receive a lead with a credit score below 680, regardless of scoring.</Tip>
        </div>
      </Section>

      {/* ──────────── Call Reporting ──────────── */}
      <Section title="Call Reporting" id="call-reporting">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Call outcomes</p>
          </div>
          <SimpleTable
            headers={['Outcome', 'What it means']}
            rows={[
              ['Transferred', 'Lead was successfully transferred to the broker during a live call.'],
              ['Callback Booked', 'A callback was scheduled. Shows in the upcoming callbacks list.'],
              ['No Answer', 'Lead did not pick up the phone.'],
              ['Voicemail', 'Call went to voicemail. A message may or may not have been left.'],
              ['Wrong Number', 'Phone number was invalid or belonged to someone else.'],
              ['Not Interested', 'Lead answered but declined to proceed.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Outcome chart</p>
            <p>
              The chart on the Calls page shows a breakdown of call outcomes over time.
              Use it to spot trends, like a spike in no-answers (could indicate bad phone data)
              or a drop in transfers (might need to check broker availability).
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Upcoming callbacks</p>
            <p>
              The callbacks list shows all scheduled callbacks sorted by date.
              Overdue callbacks are highlighted. Each entry shows the lead name,
              broker, scheduled time, and associated notes.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Filtering</p>
            <BulletList items={[
              'Filter by broker to see calls for a specific broker only.',
              'Filter by date range to narrow the time window.',
              'Combine both filters to drill into specific broker performance over a period.',
            ]} />
          </div>
        </div>
      </Section>

      {/* ──────────── Marketers ──────────── */}
      <Section title="Marketers" id="marketers">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">What marketers are</p>
            <p>
              Marketers are people who manage a subset of your brokers. They get their own
              login and see a filtered dashboard showing only their assigned brokers&apos; data.
              They can send leads via API scoped to their broker pool.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Adding a marketer and assigning brokers</p>
            <StepList steps={[
              'Go to Marketers in the sidebar.',
              'Click New Marketer and fill in name, email, and phone.',
              'Click the Users icon on their row to assign brokers to them.',
              'Multiple marketers can share the same broker. Stats are tracked per-marketer.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Magic link invites</p>
            <p>
              Click the Mail icon on a marketer row to send them a magic link login.
              This gives them access to the marketer dashboard. No passwords needed.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">API tokens</p>
            <p>
              Each marketer has a unique API token. When they send leads using their Bearer token,
              the scoring engine only considers orders belonging to their assigned brokers.
              The lead is tagged with the marketer&apos;s ID for attribution tracking.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Marketer-scoped routing</p>
            <BulletList items={[
              'Leads sent with a marketer token are only routed to that marketer\'s broker pool.',
              'If the marketer has no brokers assigned, the API returns an error.',
              'Marketers can reassign leads between their own brokers but cannot see other brokers.',
              'Marketers cannot create or edit orders or broker settings.',
            ]} />
          </div>
        </div>
      </Section>

      {/* ──────────── Alerts & Monitoring ──────────── */}
      <Section title="Alerts & Monitoring" id="alerts-monitoring">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Real-time SMS alerts</p>
            <BulletList items={[
              'Delivery failure alerts fire immediately when a webhook, email, or SMS delivery fails.',
              'Unassigned lead alerts notify you when a lead cannot be matched to any order.',
              'Alerts are sent via SMS to the admin phone number configured in Settings.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Daily digest</p>
            <p>
              A daily summary is sent every day at 8:00 AM Pacific. It includes total leads
              received, assignment rate, delivery success rate, and any orders nearing capacity.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Delivery health indicators</p>
          </div>
          <SimpleTable
            headers={['Indicator', 'Meaning']}
            rows={[
              ['Green', 'All recent deliveries succeeded. No issues.'],
              ['Yellow', 'Some deliveries failed in the last 24 hours. Check the activity log.'],
              ['Red', 'Multiple consecutive failures. Likely a broker webhook is down or email is bouncing.'],
            ]}
          />
          <Tip>When you see a red indicator, check the broker&apos;s delivery settings. Common causes: expired webhook URL, full email inbox, or invalid phone number.</Tip>
        </div>
      </Section>

      {/* ──────────── Settings ──────────── */}
      <Section title="Settings" id="settings">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Pricing table</p>
            <p>
              The pricing table defines the cost per lead based on vertical and credit tier.
              This is used to calculate revenue on the dashboard and in reports.
            </p>
          </div>
          <SimpleTable
            headers={['Tier', 'Credit Range', 'Description']}
            rows={[
              ['Tier 1', '720+', 'Premium leads. Highest price.'],
              ['Tier 2', '680-719', 'Good credit. Standard price.'],
              ['Tier 3', '640-679', 'Fair credit. Reduced price.'],
              ['Tier 4', '600-639', 'Minimum qualifying. Lowest price.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Per-broker price overrides</p>
            <p>
              You can override the default pricing for specific brokers. This is useful for
              brokers with special deals or volume discounts. Overrides are set per broker
              and apply to all their orders.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Alert configuration</p>
            <BulletList items={[
              'Set the admin phone number for SMS alerts.',
              'Toggle individual alert types on or off (delivery failures, unassigned leads, daily digest).',
              'Configure alert thresholds (e.g. only alert after 3 consecutive delivery failures).',
            ]} />
          </div>
        </div>
      </Section>

      {/* ──────────── Scoring Engine ──────────── */}
      <Section title="Scoring Engine" id="scoring-engine">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">How scoring works</p>
            <p>
              Every incoming lead is scored against all eligible orders on a 0-100 scale.
              The order with the highest score wins the lead. If scores are tied,
              the order with the lowest fill rate (most remaining capacity) wins.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Score breakdown</p>
          </div>
          <SimpleTable
            headers={['Component', 'Max Points', 'How it works']}
            rows={[
              ['Credit Fit', '40', 'How far above the order\'s minimum the lead\'s credit score is. Closer match = higher score.'],
              ['Capacity', '30', 'Orders with more remaining capacity score higher. Encourages even distribution.'],
              ['Tier Match', '20', '20 points for exact credit tier match. 10 points for adjacent tier fallback.'],
              ['Loan Fit', '10', '10 points if the funding amount falls within the order\'s loan range. 0 if outside.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Modifiers</p>
          </div>
          <SimpleTable
            headers={['Modifier', 'Points', 'Condition']}
            rows={[
              ['Priority bonus', '+8', 'Applied to high-priority orders.'],
              ['Urgency (high fill)', '+5', 'Order is more than 80% full. Helps it finish before expiring.'],
              ['Urgency (low fill)', '-5', 'Order is less than 10% full. Deprioritized in favor of fuller orders.'],
              ['Bonus mode', '+0', 'No extra score, but order stays active after reaching lead count.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Credit tier gating</p>
            <p>
              This is a hard filter, not a scoring factor. An order with a 680+ credit minimum
              will <span className="font-medium text-foreground">never</span> receive a lead with a credit score below 680.
              The scoring engine does not even evaluate the order for sub-threshold leads.
              This protects brokers who pay premium prices for high-credit leads.
            </p>
          </div>

          <Tip>Every scoring decision is logged in the routing audit trail. Open any lead&apos;s detail page to see which orders were considered, their individual scores, and why the winner was chosen.</Tip>
        </div>
      </Section>
    </div>
  )
}

/* ─────────────────────────── marketer help ─────────────────────────── */

const marketerTocItems = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'your-dashboard', label: 'Your Dashboard' },
  { id: 'sending-leads', label: 'Sending Leads' },
  { id: 'viewing-leads', label: 'Viewing Leads' },
  { id: 'managing-brokers', label: 'Managing Brokers' },
  { id: 'reassigning-leads', label: 'Reassigning Leads' },
  { id: 'call-reporting', label: 'Call Reporting' },
  { id: 'settings', label: 'Settings' },
  { id: 'permissions', label: 'What You Can\'t Do' },
]

function MarketerHelp() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center">
          <HelpCircle className="size-5 text-red-700 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Marketer Manual</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your guide to submitting leads and tracking performance.
          </p>
        </div>
      </div>

      {/* Table of Contents */}
      <nav className="glass-card rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Quick Navigation</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {marketerTocItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-sm text-foreground/70 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ──────────── Getting Started ──────────── */}
      <Section title="Getting Started" id="getting-started">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Logging in</p>
            <StepList steps={[
              'Go to /marketer/login and enter your email address.',
              'Check your inbox for a magic link. Click it to log in.',
              'No password needed. The link is single-use and expires after a short time.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">What you can see</p>
            <p>
              Everything in your dashboard is scoped to your assigned brokers only.
              You will never see data from other marketers or brokers that haven&apos;t been assigned to you.
              All KPIs, charts, leads, and activity are filtered automatically.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Dashboard overview</p>
            <p>
              The Overview page is your home base. It shows KPIs, charts, and recent activity
              for your assigned brokers. Use this as your daily snapshot of how things are going.
            </p>
          </div>
        </div>
      </Section>

      {/* ──────────── Your Dashboard ──────────── */}
      <Section title="Your Dashboard" id="your-dashboard">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p>All KPIs and charts are scoped to your assigned brokers. Here&apos;s what you see:</p>
          </div>
          <SimpleTable
            headers={['KPI', 'What it means']}
            rows={[
              ['Total Leads', 'All leads from your brokers in the selected period.'],
              ['Assigned', 'Leads successfully matched to one of your broker\'s orders.'],
              ['Unassigned', 'Leads that came in but had no matching order.'],
              ['Rejected', 'Leads that failed validation (credit too low, missing funding amount).'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Date range filters</p>
            <BulletList items={[
              'Use the date picker at the top to filter all dashboard data by time range.',
              'Toggle comparison mode to see period-over-period changes (this week vs. last week).',
              'Date filters apply across Overview, Leads, and Activity pages.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Understanding the metrics</p>
            <BulletList items={[
              'Assignment rate = assigned / total leads. Higher is better.',
              'If your assignment rate is low, your brokers may need more orders or broader order criteria.',
              'Charts update in real time. Refresh the page after sending leads to see changes.',
            ]} />
          </div>
        </div>
      </Section>

      {/* ──────────── Sending Leads ──────────── */}
      <Section title="Sending Leads" id="sending-leads">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Finding your API token</p>
            <StepList steps={[
              'Go to Settings in the sidebar.',
              'Your API token is displayed there. Click to copy it.',
              'Keep it safe. Anyone with your token can send leads to your broker pool.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Making the API call</p>
          </div>
          <Code>{`POST https://ppl-leadr-mgmt.vercel.app/api/leads/incoming
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Doe",
  "phone": "+15551234567",
  "vertical": "MCA",
  "credit_score": 680,
  "funding_amount": 35000
}`}</Code>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Required fields</p>
          </div>
          <SimpleTable
            headers={['Field', 'Type', 'Notes']}
            rows={[
              ['first_name', 'string', 'Lead\'s first name.'],
              ['last_name', 'string', 'Lead\'s last name.'],
              ['phone', 'string', 'Phone number, min 7 characters.'],
              ['vertical', 'string', '"MCA", "SBA", "Equipment", etc.'],
              ['credit_score', 'number', '300-850. Below 600 is auto-rejected.'],
              ['funding_amount', 'number', 'Positive number. Missing = rejected.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Optional fields</p>
          </div>
          <SimpleTable
            headers={['Field', 'Type', 'Notes']}
            rows={[
              ['email', 'string', 'Valid email. Used for deduplication with phone.'],
              ['business_name', 'string', 'The lead\'s business name.'],
              ['state', 'string', 'US state code (e.g. "TX") or full name.'],
              ['ghl_contact_id', 'string', 'GoHighLevel contact ID. Used for dedup if provided.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Lead routing</p>
            <p>
              When you send a lead with your Bearer token, the system only considers orders
              from your assigned brokers. The lead is scored against those orders and assigned
              to the best match. If no order matches, the lead goes to your unassigned queue.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Response statuses</p>
          </div>
          <SimpleTable
            headers={['Status', 'What it means']}
            rows={[
              ['assigned', 'Lead created and routed to one of your brokers.'],
              ['unassigned', 'Lead created but no matching order found.'],
              ['rejected', 'Failed validation (credit below 600, missing funding amount).'],
              ['duplicate', 'A lead with that phone or contact ID already exists.'],
            ]}
          />

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Sample response (assigned)</p>
          </div>
          <Code>{`{
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
}`}</Code>
          <Tip>A 401 response means your token is invalid or expired. Check Settings for your current token. A specific error about &quot;no brokers assigned&quot; means the admin needs to assign brokers to your account.</Tip>
        </div>
      </Section>

      {/* ──────────── Viewing Leads ──────────── */}
      <Section title="Viewing Leads" id="viewing-leads">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p>
              The Leads page shows all leads from your brokers. This includes leads you sent
              via the API and any leads routed to your brokers from other sources.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Filtering leads</p>
            <BulletList items={[
              <><span className="font-medium text-foreground">Status</span> - assigned, unassigned, rejected, duplicate</>,
              <><span className="font-medium text-foreground">Vertical</span> - MCA, SBA, Equipment, etc.</>,
              <><span className="font-medium text-foreground">Broker</span> - filter to a specific broker from your pool</>,
              <><span className="font-medium text-foreground">Date range</span> - narrow down by when the lead was created</>,
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Lead detail page</p>
            <p>
              Click any lead to see its full details. You&apos;ll see delivery status
              (pending, delivered, failed), routing audit trail (why it was assigned to
              that broker), and a timeline of events.
            </p>
          </div>
        </div>
      </Section>

      {/* ──────────── Managing Brokers ──────────── */}
      <Section title="Managing Brokers" id="managing-brokers">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p>
              You can view your assigned brokers on the Brokers page. This is read-only.
              You cannot edit broker settings. That&apos;s admin only.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">What you can see</p>
            <BulletList items={[
              'Broker name, contact info, and company',
              'Their active orders and remaining order capacity',
              'Leads delivered to them and delivery success stats',
              'Contact hours and delivery method configuration',
            ]} />
          </div>

          <Tip>If a broker needs changes to their settings, delivery methods, or contact hours, reach out to the admin. You can view but not edit.</Tip>
        </div>
      </Section>

      {/* ──────────── Reassigning Leads ──────────── */}
      <Section title="Reassigning Leads" id="reassigning-leads">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">How to reassign</p>
            <StepList steps={[
              'Go to Leads in the sidebar.',
              'Find the lead you want to move.',
              'Use the reassign action to pick a different broker from your pool.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Rules</p>
            <BulletList items={[
              'You can only reassign to brokers assigned to you.',
              'You won\'t see brokers outside your assignment in the dropdown.',
              'The lead\'s routing audit will show the reassignment with a timestamp.',
            ]} />
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">When to reassign</p>
            <BulletList items={[
              'Wrong vertical match (e.g. SBA lead went to an MCA-only broker)',
              'Broker at capacity or unavailable',
              'Better fit with another broker based on lead details',
            ]} />
          </div>
        </div>
      </Section>

      {/* ──────────── Call Reporting ──────────── */}
      <Section title="Call Reporting" id="call-reporting">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p>
              The Calls page shows call outcomes for your brokers. This tracks what happens
              after a lead is delivered.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium text-foreground">What you can do</p>
            <BulletList items={[
              'View call outcomes (completed, no answer, voicemail, etc.) for each broker',
              'Filter by specific broker to see their individual performance',
              'Track upcoming callbacks so nothing falls through the cracks',
            ]} />
          </div>

          <Tip>Callbacks that are overdue are highlighted. Use this to follow up with brokers who haven&apos;t made their scheduled calls.</Tip>
        </div>
      </Section>

      {/* ──────────── Settings ──────────── */}
      <Section title="Settings" id="settings">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p>
              The Settings page shows your API token. This is the only setting you need to manage.
            </p>
          </div>

          <Divider />

          <div className="space-y-2 text-sm text-foreground/80">
            <BulletList items={[
              'Your API token is used for authenticated lead submission via the API.',
              'Copy the token and use it as a Bearer token in your API calls.',
              'Do not share your token. It grants access to send leads to all your assigned brokers.',
            ]} />
          </div>
        </div>
      </Section>

      {/* ──────────── What You Can't Do ──────────── */}
      <Section title="What You Can't Do" id="permissions">
        <div className="space-y-3">
          <div className="space-y-2 text-sm text-foreground/80">
            <p>As a marketer, some actions are restricted to admins:</p>
          </div>
          <SimpleTable
            headers={['Action', 'Why it\'s restricted']}
            rows={[
              ['Create or edit orders', 'Only admins can create lead orders and set their parameters.'],
              ['Edit broker settings', 'Delivery methods, contact hours, and broker config are admin-only.'],
              ['See unassigned queue', 'The global unassigned queue is admin-only.'],
              ['Manage other marketers', 'You can\'t create, edit, or view other marketer accounts.'],
              ['See other brokers', 'Your view is strictly scoped to your assigned broker pool.'],
            ]}
          />

          <Tip>If you need something outside your access level, contact the admin. They can make changes on your behalf or adjust your broker assignments.</Tip>
        </div>
      </Section>
    </div>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default async function HelpPage() {
  const role = await getRole()

  if (role === 'marketer') {
    return <MarketerHelp />
  }

  return <AdminHelp />
}
