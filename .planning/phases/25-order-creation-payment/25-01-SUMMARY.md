---
phase: 25-order-creation-payment
plan: 01
status: complete
completed_at: 2026-03-17
---

## Phase 25: Order Creation + Payment - Summary

### What was built
1. **Migration** (`supabase/migrations/00028_order_stripe_columns.sql`): Adds `stripe_checkout_session_id`, `stripe_payment_intent_id`, `price_per_lead_cents`, `total_price_cents` columns to orders table. Updates status constraint to allow `pending_payment`.

2. **Stripe client** (`src/lib/stripe/client.ts`): Singleton Stripe SDK instance using `STRIPE_SECRET_KEY` env var.

3. **Portal order schema** (`src/lib/schemas/portal-order.ts`): Zod schema for broker order form with vertical, credit_tier_min, and lead_count validation.

4. **Server actions** (`src/lib/actions/portal-order.ts`):
   - `lookupPrice()` - returns price in cents for live display on form
   - `createCheckoutSession()` - validates input, looks up price, creates Stripe Checkout session with metadata, redirects to Stripe

5. **Stripe webhook** (`src/app/api/stripe/webhook/route.ts`): Handles `checkout.session.completed` event. Verifies signature, extracts metadata, creates order in database with status "active". Includes idempotency check. Triggers auto-reassignment of unassigned leads.

6. **Order form** (`src/components/portal/order-form.tsx`): Client component with vertical select, credit tier select, lead count input, live price calculation display, and submit-to-Stripe flow.

7. **Portal pages**:
   - `/portal/orders/new` - renders the order form
   - `/portal/orders/success` - post-payment confirmation
   - `/portal/orders/cancel` - cancelled checkout message

8. **Dashboard integration**: Added "New Order" button to ActiveOrdersCard in portal dashboard.

### Key design decisions
- **No order until payment**: Order is NOT created in the database until the Stripe webhook confirms payment. Abandoned/failed checkouts create no record.
- **price_data approach**: Uses Stripe's inline `price_data` instead of pre-created Products/Prices. No Stripe dashboard product setup needed.
- **Metadata passthrough**: All order details (broker_id, vertical, credit_tier_min, lead_count, prices) are stored as Stripe session metadata and read back in the webhook.
- **Idempotency**: Webhook checks for existing order by `stripe_checkout_session_id` before inserting.

### Environment variables needed
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `NEXT_PUBLIC_APP_URL` - Base URL for success/cancel redirects (defaults to localhost:3000)

### Success criteria met
1. Broker can create order by selecting vertical, credit tier, and lead count from portal
2. Submitting redirects to Stripe Checkout with correct line items and total
3. checkout.session.completed webhook creates order with status "active"
4. Abandoned/failed checkouts create no order record
5. Created order contains stripe_checkout_session_id and stripe_payment_intent_id
