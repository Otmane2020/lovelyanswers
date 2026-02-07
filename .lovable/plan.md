
# Premium Audit Paywall at $9.99 USD

## What Changes

The "Get Premium Audit" button currently sends users directly to `/audit-premium` where the full analysis runs for free. We'll add a $9.99 one-time payment step before granting access to the premium report.

## How It Works

1. User clicks "Get Premium Audit" on the free audit results page
2. They're redirected to a Stripe Checkout page ($9.99 one-time payment)
3. After payment, they land on `/audit-premium?url=...&paid=true` with the report unlocked
4. The Premium Audit page checks for a valid payment session before running the analysis

## Steps

### 1. Create Stripe Product and Price
- Create a new Stripe product: **"Premium AEO Audit"** at **$9.99 USD** (one-time payment)
- This gives us a `price_id` to use in the checkout flow

### 2. Create `create-audit-checkout` Edge Function
- New edge function: `supabase/functions/create-audit-checkout/index.ts`
- Accepts: `{ url: string }` (the website URL to audit)
- Does NOT require authentication (guest checkout via Stripe)
- Creates a Stripe Checkout session in `mode: "payment"` with the $9.99 price
- Success URL: `/audit-premium?url={url}&session_id={CHECKOUT_SESSION_ID}`
- Cancel URL: `/audit?url={url}`
- Returns the checkout session URL

### 3. Create `verify-audit-payment` Edge Function
- New edge function: `supabase/functions/verify-audit-payment/index.ts`
- Accepts: `{ session_id: string }`
- Verifies the Stripe Checkout session status is `"complete"` or `"paid"`
- Returns `{ paid: true }` or `{ paid: false }`
- No auth required (the session_id is the proof)

### 4. Update `AuditPremium.tsx` Page
- On load, check for `session_id` query param
- If present, call `verify-audit-payment` to confirm payment
- If paid: run the analysis as normal
- If NOT paid (no session_id or verification fails): show a paywall card with:
  - Price display: **$9.99** one-time
  - Feature list (competitor analysis, schema audit, 90-day plan, content gaps)
  - "Pay & Get Premium Audit" button that calls `create-audit-checkout`
  - The URL input form remains so users can enter their website before paying

### 5. Update "Get Premium Audit" buttons in `Audit.tsx`
- Change the two "Get Premium Audit" buttons to call `create-audit-checkout` directly (bypassing the AuditPremium page)
- This way, clicking the button immediately starts the Stripe checkout flow
- Add price display: "Get Premium Audit - $9.99"

## Technical Details

### Edge Function: `create-audit-checkout`
```text
POST /create-audit-checkout
Body: { url: "https://example.com" }
Response: { url: "https://checkout.stripe.com/..." }
```
- No authentication required (supports guest purchases)
- If user is logged in, uses their email for the Stripe customer
- If not, Stripe collects email at checkout

### Edge Function: `verify-audit-payment`
```text
POST /verify-audit-payment
Body: { session_id: "cs_..." }
Response: { paid: true/false }
```
- Verifies the Checkout Session's `payment_status === "paid"`

### AuditPremium.tsx Changes
- Add state: `isPaid`, `isVerifying`, `sessionId`
- On mount: extract `session_id` from URL params, verify via edge function
- If verified: proceed with analysis (existing behavior)
- If not verified: show paywall UI instead of the analysis form
- The paywall includes the URL input + payment button

### Audit.tsx Changes
- "Get Premium Audit" buttons call a new `handlePremiumAudit()` function
- This function invokes `create-audit-checkout` with the current URL
- Redirects to Stripe Checkout
- Add "$9.99" price label next to the button text

### Config
- Add function entries to `supabase/config.toml` with `verify_jwt = false` (public access for guest checkout)

### Files to Create
- `supabase/functions/create-audit-checkout/index.ts`
- `supabase/functions/verify-audit-payment/index.ts`

### Files to Modify
- `src/pages/AuditPremium.tsx` (add paywall gate)
- `src/pages/Audit.tsx` (update "Get Premium Audit" buttons to trigger checkout)
- `supabase/config.toml` (add new function entries)
