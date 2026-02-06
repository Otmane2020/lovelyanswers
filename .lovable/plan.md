

# Checkout Page Redesign

## Summary of Changes

This plan redesigns the `/checkout` page to be more professional, conversion-oriented, and aligned with the marketing strategy. Here are all the changes:

---

## 1. Switch to Light Theme

The page currently forces dark mode. We will switch it to force **light mode** instead (removing `dark` class), consistent with other marketing pages (Index, Auth, Onboarding).

## 2. Default to Annual Billing

The billing cycle default will change from `"monthly"` to `"annual"`. The annual card will emphasize **"2 months free"** instead of the current "Best value" badge, making the savings immediately clear.

## 3. Remove 3-Day Trial from Stripe Checkout

The `create-checkout` edge function currently sets `trial_period_days: 3`. This will be **removed** so users are charged immediately upon checkout (no free trial).

## 4. Redesign Pricing Cards

- **Annual card**: Show crossed-out original price, highlight the monthly equivalent, and add a prominent green "2 months free" badge
- **Monthly card**: Clean display with `$29/month`, remove the misleading "50% OFF" badge
- Both cards get a more polished, professional look with better visual hierarchy

## 5. Replace Amateur Icons with Clean Feature List

Instead of using emojis inline with a generic `Check` icon, each feature will use a **styled gradient check icon** only (no emojis). The feature text will be clean and professional:

- AEO Answers: Rank #1 on ChatGPT, Gemini and Perplexity
- 30 SEO-optimized articles auto-published monthly
- Local AEO: Dominate local AI search results
- Auto-posting to WordPress, Shopify, Webflow and more
- Automated keyword research and SERP clustering
- Reddit Agent for brand visibility and backlinks
- Technical SEO audit (Google + AI crawlers)
- 20+ languages supported worldwide

## 6. Add TrustAvis Social Proof Widget

A clickable TrustAvis badge will be added below the guarantee section, showing:
- 4.9 star rating (with gold star icons)
- 289 reviews
- "Excellent" badge
- Links to: https://trust-avis.com/entreprise/lovelyanswers

## 7. Improve CTA Button

The main call-to-action button will display:
- "Start now" with the price for the selected plan
- Gradient styling for visual impact
- Larger, more prominent sizing

## 8. Improve Overall Layout

- Add a subtle tagline under the title: "Everything you need to dominate AI search results"
- Better spacing and visual breathing room
- Professional typography hierarchy
- Keep the 14-day money-back guarantee with shield icon

---

## Technical Details

### Files Modified

1. **`src/pages/Checkout.tsx`** -- Full redesign:
   - Change `useEffect` from adding `dark` class to removing it (light theme)
   - Change default `billingCycle` state from `"monthly"` to `"annual"`
   - Remove emojis from features list
   - Redesign pricing cards with "2 months free" badge on annual
   - Remove "50% OFF" badge from monthly
   - Add TrustAvis social proof section with external link
   - Use styled gradient checkmarks instead of plain icons
   - Improve overall layout and typography

2. **`supabase/functions/create-checkout/index.ts`** -- Remove trial:
   - Remove `subscription_data: { trial_period_days: 3 }` from the Stripe checkout session creation
   - Users will be charged immediately

### No Database Changes Required

### No New Dependencies Required

