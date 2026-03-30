import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

export default function PortalHelpPage() {
  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">User Manual</h1>
        <p className="text-muted-foreground mt-1">
          Everything you need to know about using your PPL Portal.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Getting Started                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Getting Started</CardTitle>
          <CardDescription>
            First time here? This section walks you through the basics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Logging In with Magic Link
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Visit the portal login page and enter the email address
                associated with your broker account.
              </li>
              <li>
                Check your inbox for an email from PPL containing a one-time
                magic link. No password required.
              </li>
              <li>
                Click the link to sign in instantly. The link expires after a
                short time, so use it promptly.
              </li>
              <li>
                If you do not see the email, check your spam or junk folder.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Your Dashboard Overview
            </h3>
            <p>
              After signing in you land on the Dashboard. This is your
              command center, showing a snapshot of your active orders,
              recent leads, call activity, credit quality, and spend. Every
              card is designed to give you at-a-glance insight without
              digging through tables.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Understanding the Date Range Filter
            </h3>
            <p>
              At the top of most pages you will find a date range filter. Use
              the preset options (today, last 7 days, last 30 days, etc.) or
              pick a custom range. The filter applies to every chart and
              metric on the page so you can compare any period at a glance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Your Dashboard                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Dashboard</CardTitle>
          <CardDescription>
            A breakdown of every card on your home screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Active Orders
            </h3>
            <p>
              Shows your currently running orders. The progress bar indicates
              how many leads have been delivered out of the total ordered.
              When the bar reaches 100%, the order is complete.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Next Callback
            </h3>
            <p>
              Displays the soonest upcoming scheduled callback so you know
              exactly when to expect the next call from a lead.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Average Credit Score
            </h3>
            <p>
              The average credit score across your leads for the selected
              period. The color tells you the quality at a glance:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>
                <span className="text-green-600 dark:text-green-400 font-medium">Green (680+)</span>{' '}
                &mdash; strong credit quality
              </li>
              <li>
                <span className="text-amber-600 dark:text-amber-400 font-medium">Amber (600 &ndash; 679)</span>{' '}
                &mdash; moderate credit quality
              </li>
              <li>
                <span className="text-red-600 dark:text-red-400 font-medium">Red (below 600)</span>{' '}
                &mdash; lower credit quality
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Call Summary
            </h3>
            <p>
              A quick look at your total calls and your transfer rate (the
              percentage of calls that were successfully connected to you).
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Credit Score Tiers
            </h3>
            <p>
              A compact chart showing the distribution of your leads across
              credit score buckets. Helpful for understanding the overall
              quality mix you are receiving.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Vertical Mix
            </h3>
            <p>
              A breakdown of your leads by funding vertical (e.g., MCA, term
              loans, lines of credit). Use this to see which products are
              driving the most volume.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Spend Summary
            </h3>
            <p>
              Three numbers at a glance: your all-time spend, your spend
              this month, and the total value of your active orders. Great
              for budgeting and tracking investment.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Delivery Health
            </h3>
            <p>
              Shows success rates for each delivery method (webhook, email,
              SMS). If any channel is underperforming, you will see it here
              first. Head to Settings to update your delivery configuration.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Lead Volume Trend
            </h3>
            <p>
              A time-series chart of leads received over the selected date
              range. Useful for spotting patterns, slow days, or ramp-ups.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Spend Trend
            </h3>
            <p>
              Your monthly spend history over the past 12 months. Helps you
              see how your investment has changed over time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Your Leads                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Leads</CardTitle>
          <CardDescription>
            Finding, filtering, and understanding your lead data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Viewing Your Lead List
            </h3>
            <p>
              The Leads page shows every lead delivered to you. Each row
              includes the lead name, vertical, credit score, delivery
              status, and date received.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Searching and Filtering
            </h3>
            <p>
              Use the search bar to find leads by name. You can also filter
              by vertical or delivery status to narrow results quickly.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Understanding Delivery Statuses
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium text-foreground">Sent</span>{' '}
                &mdash; the lead was successfully delivered to you.
              </li>
              <li>
                <span className="font-medium text-foreground">Retrying</span>{' '}
                &mdash; delivery failed on the first attempt and the system
                is automatically retrying.
              </li>
              <li>
                <span className="font-medium text-foreground">Queued</span>{' '}
                &mdash; the lead is waiting to be delivered (usually
                processes within seconds).
              </li>
              <li>
                <span className="font-medium text-foreground">Failed</span>{' '}
                &mdash; all delivery attempts were unsuccessful. Check your
                delivery settings or contact support.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Viewing Delivery Attempt History
            </h3>
            <p>
              Click on any lead row to expand it and see a detailed log of
              every delivery attempt, including timestamps and error
              messages. This is useful for troubleshooting failed deliveries.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Exporting Leads to CSV
            </h3>
            <p>
              Use the export button at the top of the leads table to
              download your current filtered view as a CSV file. Handy for
              importing into your CRM or running your own analysis.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Call Reporting                                                       */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call Reporting</CardTitle>
          <CardDescription>
            Understanding your call outcomes and callback schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Call Outcomes Explained
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium text-foreground">Transferred</span>{' '}
                &mdash; the call was successfully connected to you (a live
                transfer).
              </li>
              <li>
                <span className="font-medium text-foreground">Callback Booked</span>{' '}
                &mdash; the lead scheduled a callback for a later time.
              </li>
              <li>
                <span className="font-medium text-foreground">No Answer</span>{' '}
                &mdash; the lead did not pick up.
              </li>
              <li>
                <span className="font-medium text-foreground">Voicemail</span>{' '}
                &mdash; the call went to voicemail.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              KPI Cards and Percentages
            </h3>
            <p>
              At the top of the Calls page you will see cards for total
              calls, transfers, callbacks booked, and no-answers. Each card
              shows the count and the percentage of total calls so you can
              quickly gauge performance.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Outcome Trend Chart
            </h3>
            <p>
              The stacked chart below the KPI cards shows call outcomes over
              time. It automatically switches between daily and weekly
              buckets depending on your selected date range. Use it to spot
              trends in transfer rates or callback volume.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Upcoming Callbacks
            </h3>
            <p>
              A list of callbacks that have been scheduled but not yet
              completed. Each entry shows the lead name, scheduled time, and
              phone number so you know exactly when to expect a call back.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Analytics                                                           */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analytics</CardTitle>
          <CardDescription>
            Deeper insights into your lead quality and mix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Credit Score Distribution
            </h3>
            <p>
              A histogram showing how your leads break down across credit
              score tiers. Use this to understand the quality profile of the
              leads you are receiving and to set expectations with your
              sales team.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Vertical Mix
            </h3>
            <p>
              A chart showing which funding verticals your leads are coming
              from. Helpful for understanding your product mix and
              identifying which verticals are generating the most activity.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Using Date Filters to Compare Periods
            </h3>
            <p>
              Switch between date presets or set custom ranges to compare
              analytics across different time periods. For example, compare
              last 7 days against the previous 30 to see if lead quality is
              trending up.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Your Orders                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Orders</CardTitle>
          <CardDescription>
            Managing your lead orders and understanding their lifecycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Order Statuses
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium text-foreground">Active</span>{' '}
                &mdash; your order is live and leads are being delivered.
              </li>
              <li>
                <span className="font-medium text-foreground">Paused</span>{' '}
                &mdash; delivery is temporarily on hold. You can resume at
                any time.
              </li>
              <li>
                <span className="font-medium text-foreground">Completed</span>{' '}
                &mdash; all ordered leads have been delivered.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Order Progress
            </h3>
            <p>
              Each order shows a progress bar indicating how many leads have
              been delivered versus the total quantity ordered. You can track
              fulfillment in real time.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Pausing and Resuming Orders
            </h3>
            <p>
              Need to take a break? You can pause an active order at any
              time. Delivery stops immediately and resumes the moment you
              unpause. Your remaining lead count is preserved.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Creating New Orders
            </h3>
            <p>
              Order creation through the portal is temporarily unavailable.
              To place a new order, please contact your account manager
              directly and they will set it up for you.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Billing                                                             */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing</CardTitle>
          <CardDescription>
            Tracking your charges and accessing receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Viewing Your Order History
            </h3>
            <p>
              The Billing page lists all your past and current orders along
              with their associated charges. Each entry shows the order
              details, amount, and payment status.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Understanding Charges
            </h3>
            <p>
              You are charged on a per-lead basis. The cost per lead depends
              on your order configuration (vertical, credit tier, volume).
              Your total charge equals leads delivered multiplied by the
              per-lead price.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Accessing Stripe Receipts
            </h3>
            <p>
              Payment receipts are available through Stripe. Look for the
              receipt link next to each charge to view or download a
              detailed receipt for your records.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Settings                                                            */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settings</CardTitle>
          <CardDescription>
            Configuring how and when you receive leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-1">
              Delivery Methods
            </h3>
            <p>
              You can receive leads via webhook, email, SMS, or any
              combination. Enable or disable each method from the Settings
              page. We recommend keeping at least two methods active as a
              fallback.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Webhook URL Configuration
            </h3>
            <p>
              If you use webhook delivery, enter the URL where you want
              leads posted. The system sends a JSON payload with full lead
              details to your endpoint. Make sure your URL returns a 200
              status code to confirm receipt.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Contact Hours and Timezone
            </h3>
            <p>
              Set your business hours and timezone so leads are only
              delivered during times when you are available to act on them.
              Leads generated outside your contact hours are queued and
              delivered when your window opens.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">
              Weekend Pause
            </h3>
            <p>
              Toggle this on to automatically pause lead delivery on
              weekends. Leads are held and delivered on Monday morning when
              your contact hours start. Useful if your team does not work
              weekends.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Need Help?                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <p>
            If you have questions that are not covered here, reach out to your
            account manager or contact our support team. We are happy to help
            you get the most out of your PPL Portal.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
