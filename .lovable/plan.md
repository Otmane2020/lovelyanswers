

# Sales Analysis Dashboard for SuperAdmin

## Problem
There is no sales/revenue analysis in the SuperAdmin panel. The `invoices` table in the database is empty, and all payment data lives in Stripe.

## Solution
Add a new **"Sales"** tab in SuperAdmin that fetches real payment data from Stripe and displays it with period filters (Today, Yesterday, 7 Days, 30 Days, All Time).

## What You'll See

The new Sales tab will show:
- **Revenue cards**: Total revenue, number of transactions, average order value, and MRR (Monthly Recurring Revenue)
- **Period filters**: Today, Yesterday, 7 Days, 30 Days, All Time
- **Transactions table**: List of all payments with date, customer email, amount, status, and type (subscription vs one-time)
- **Revenue breakdown**: Subscriptions vs one-time payments (premium audits)

## Technical Details

### 1. New Edge Function: `admin-sales-analytics`
- Fetches payment intents and subscriptions from Stripe API
- Filters by date range based on requested period
- Returns aggregated stats + transaction list
- Protected: only callable by admin

### 2. New Component: `src/components/admin/SalesAnalytics.tsx`
- Period tabs (Today, Yesterday, 7 Days, 30 Days, All Time)
- Revenue summary cards with formatted amounts
- Scrollable transactions table with status badges
- Loading states

### 3. Update `src/pages/SuperAdmin.tsx`
- Add a "Sales" tab with DollarSign icon
- Import and render the new `SalesAnalytics` component

