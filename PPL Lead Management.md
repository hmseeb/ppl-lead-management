Build a lead distribution and round-robin management app for BadAAAS. This is an internal admin tool that receives incoming funding leads via webhook, matches them to brokers based on criteria, and distributes them using smart rotation. Think of it as a smart lead sorter — leads come in, the app figures out which broker should get it, and fires it off to that broker's GHL sub-account automatically.

**How the full flow works:**

1. We run ads on Meta and Google driving business owners to a landing page where they opt in and do a soft credit pull.  
2. Once they opt in, they land on a thank you page where they wait for our AI to call them (about 2 minutes).  
3. When they opt in, they hit our main GHL sub-account, which triggers a webhook to THIS app with the lead's info.  
4. This app receives the lead, checks which brokers have active orders with matching criteria, runs the smart rotation logic, and assigns the lead to the next eligible broker.  
5. The app then fires a webhook to that broker's unique inbound webhook URL, pushing the lead data into their individual GHL sub-account.  
6. The broker's own GHL automations handle notifying them from there.

The whole thing needs to happen fast — ideally the assignment happens within seconds of receiving the webhook, since the business owner is sitting on a thank you page waiting.

**Technical Architecture:**

**Inbound Webhook Endpoint (POST /api/leads/incoming):** Accepts the lead data from our main GHL sub-account. Payload includes:

* first\_name  
* last\_name  
* email  
* phone  
* business\_name  
* funding\_amount\_requested  
* funding\_purpose (what it's for)  
* vertical (MCA, SBA, Equipment Finance, Working Capital, Lines of Credit, Other)  
* credit\_score (numeric, from the soft pull)  
* state  
* ai\_call\_notes (text field — transcript/notes from the AI call, may be empty if AI hasn't called yet or they didn't answer)  
* ai\_call\_status (completed, no\_answer, pending)  
* ghl\_contact\_id  
* timestamp

When this endpoint receives a lead, it should:

1. Store the lead in the database immediately  
2. Run the matching \+ rotation logic  
3. Assign to a broker (or hold in unassigned queue if no match)  
4. Fire the outbound webhook to the assigned broker's URL  
5. Log the full assignment (which broker, why them, timestamp)

**Outbound Webhook (to broker's GHL sub-account):** Each broker has a unique inbound webhook URL stored in their profile. When a lead is assigned, the app fires a POST to that URL with the full lead payload: name, phone, email, business name, funding amount, funding purpose, vertical, credit score, state, AI call notes, and a reference ID from this app so we can track it.

If the webhook delivery fails, retry up to 3 times with a short delay. If it still fails, flag it in the admin dashboard so we can manually handle it.

**Broker Management (Admin):**

Admin needs to be able to create and manage broker profiles. Each broker profile includes:

* Broker name  
* Company name  
* Email  
* Phone  
* GHL sub-account webhook URL (their unique inbound webhook)  
* Status: Active / Paused / Completed

**Order Management:** Each broker can have one or more orders. An order is essentially "Broker X bought 20 leads with these criteria." An order includes:

* Order ID (auto-generated)  
* Broker (linked)  
* Total leads purchased (e.g. 20, 50, 100\)  
* Leads delivered so far (counter that increments as leads are assigned)  
* Leads remaining (calculated: total minus delivered)  
* Criteria — Vertical: multi-select from (MCA, SBA, Equipment Finance, Working Capital, Lines of Credit, All). Broker can accept multiple verticals.  
* Criteria — Credit Score Minimum: numeric field (e.g. 500, 600, 650). Lead must have a credit score at or above this number to be eligible.  
* Order status: Active / Paused / Completed / Bonus Mode  
* Date created  
* Date completed (auto-set when leads remaining hits 0\)

**Order Controls:**

* Start: Activates the order so the broker enters the rotation  
* Pause: Temporarily removes the broker from rotation without losing their place or remaining count. Use case: broker is on vacation, overwhelmed, etc.  
* Resume: Puts them back in rotation where they left off  
* Complete: Manually marks an order as done (even if leads remain — in case of refund, cancellation, etc.)  
* Bonus Mode Toggle: When toggled ON, the order continues delivering leads BEYOND the original total purchased. The leads\_delivered counter keeps going past the total, but the order doesn't auto-complete. Admin can toggle this off at any time to stop the flow. This is for when we want to give a good client a few extra leads as a gesture.

When an order's leads\_remaining hits 0 and Bonus Mode is NOT on, the order auto-completes and that broker drops out of the rotation for that order.

**Smart Rotation Logic:**

When a lead comes in, the app needs to:

1. **Filter eligible brokers:** Find all brokers with at least one ACTIVE order (status \= Active or Bonus Mode) where the lead matches the order's criteria:  
   * Lead's vertical matches one of the order's accepted verticals (or order accepts "All")  
   * Lead's credit score is \>= the order's credit score minimum  
2. **Smart weighted rotation:** Among eligible brokers, don't just do pure round-robin. Weight the rotation based on order size so that brokers who bought bigger orders get leads more frequently, but everyone still gets a fair share proportional to what they paid for. The logic should work like this:  
   * Calculate each eligible broker's "weight" as their leads\_remaining on matching orders  
   * Broker with 80 leads remaining gets roughly 4x the frequency of a broker with 20 leads remaining  
   * But never starve smaller orders — even a broker with 5 leads remaining should still get leads at a reasonable pace, just less frequently  
   * Track a running "last assigned" timestamp per broker per order so the system knows who's been waiting longest relative to their weight  
   * If two brokers have equal weight and equal wait time, just alternate  
3. **Assign the lead:** Pick the winning broker, assign the lead, decrement their leads\_remaining (unless in Bonus Mode), update the last\_assigned timestamp, and fire the outbound webhook.  
4. **No match found:** If no brokers have active orders matching the lead's criteria, hold the lead in an "Unassigned" queue. Flag it in the admin dashboard. Admin can then manually assign it to a broker or leave it.

**Admin Dashboard:**

The admin dashboard is the main interface. It should have these sections:

**Dashboard Home / Overview:**

* Total leads received today / this week / this month  
* Total leads assigned vs unassigned  
* Active brokers count  
* Active orders count  
* Recent activity feed showing the last 20 lead assignments (timestamp, lead name, assigned to broker, order ID, vertical, credit score)

**Leads View:**

* Table of all leads with columns: date/time received, name, phone, email, vertical, credit score, funding amount, assigned broker (or "Unassigned"), AI call status, assignment status  
* Filter by: date range, vertical, credit score range, assigned/unassigned, broker  
* Search by lead name, phone, or email  
* Click on a lead to see full details including AI call notes and assignment history  
* For unassigned leads: ability to manually assign to a broker from a dropdown

**Brokers View:**

* Table of all brokers: name, company, status, active orders count, total leads delivered (all time), last lead delivered date  
* Click on a broker to see their profile, all orders (current and past), and a feed of every lead they've received  
* Quick actions: pause all active orders, resume all, create new order

**Orders View:**

* Table of all orders: order ID, broker name, total purchased, delivered, remaining, verticals, credit score min, status, date created  
* Color coding: Green \= Active, Yellow \= Paused, Blue \= Bonus Mode, Gray \= Completed  
* Quick action buttons inline: Pause / Resume / Bonus Mode toggle / Complete  
* Click to expand and see every lead assigned to that order

**Unassigned Queue:**

* Dedicated section showing leads that couldn't be matched  
* Each lead shows why it wasn't matched (no active orders for that vertical, no brokers accept that credit score, all matching orders are full, etc.)  
* Admin can manually assign from here or leave in queue (in case a new order comes in that matches)

**Activity Log:**

* Full chronological log of everything: lead received, lead assigned, order created, order paused, order completed, bonus mode toggled, manual assignments, webhook failures  
* Filterable by event type, broker, date range

**Additional Requirements:**

* Clean, modern admin UI — dark or light theme is fine, just make it professional and fast. These are internal screens, not client-facing, so prioritize function over flash.  
* Everything should be real-time or near-real-time. When a lead comes in, it should appear in the dashboard without a page refresh.  
* The smart rotation logic is the core of the app — it needs to be reliable and fast. Log every decision so we can audit why a lead went to a specific broker.  
* Database: use whatever Lovable supports natively (Supabase preferred). All leads, brokers, orders, and assignments should be persisted.  
* The webhook intake needs to be robust — if GHL sends a malformed payload, don't crash. Log the error and move on.  
* Mobile-responsive is nice to have but desktop-first is fine — this is an admin tool we'll mostly use on desktop.  
* Simple auth: password-protected admin access. Can be a hardcoded password or simple login for now.

**Assumptions I've made (adjust if needed):**

* Each broker's GHL sub-account has a unique inbound webhook URL that accepts POST requests with the lead data. This URL is stored per broker in the app.  
* If a lead can't be matched, it goes to an unassigned queue for manual handling (no catch-all broker).  
* Matching criteria are vertical \+ credit score minimum only for now. State/geo can be added later.  
* AI call notes may arrive in the initial webhook or may come in a follow-up webhook update (the app should be able to receive updates to existing leads via a PATCH /api/leads/\[id\] endpoint or by matching on ghl\_contact\_id).  
* The app doesn't send SMS or email to brokers directly — it just pushes the lead to their GHL sub-account and their own automations handle notification.

