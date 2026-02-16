

## Fix: Callout and Sitelink "Invalid Argument" Errors

### Root Cause Analysis

There are **two issues** across two edge functions:

**1. `manage-pmax-service/index.ts` -- Sitelink `finalUrls` misplaced (same bug previously fixed in `optimize-pmax`)**

At line 401-404, `finalUrls` is nested inside `sitelinkAsset`. The Google Ads API v22 requires `finalUrls` at the top-level `Asset` resource, not inside `SitelinkAsset`. This was already fixed in `optimize-pmax` but the same bug remains here.

**2. Both functions -- Truncated error logging hides actual Google Ads error codes**

The `mutateResource` function only logs partial error text, making it impossible to see the specific `errorCode` (e.g., `CALLOUT_TEXT_TOO_LONG`, `DUPLICATE_ASSET`, etc.). The callout errors the user sees may be stale from a previous run -- the latest optimization run shows `needCallouts: false` (already filled). Better logging will reveal the exact issue if it recurs.

### Changes

**File: `supabase/functions/manage-pmax-service/index.ts`**

1. Move `finalUrls` from inside `sitelinkAsset` to the top-level asset payload (lines 400-405):

```text
// Before (broken):
{
  sitelinkAsset: {
    linkText: "...",
    finalUrls: ["..."],   <-- WRONG
  },
}

// After (fixed):
{
  finalUrls: ["..."],     <-- Correct: top-level
  sitelinkAsset: {
    linkText: "...",
  },
}
```

2. Improve error logging in `mutateResource` to capture full Google Ads error details (currently truncated).

**File: `supabase/functions/optimize-pmax/index.ts`**

3. Improve error logging in `mutateResource` to log the full error payload for `campaignAssets` mutations (increase from 1000 to 2000 chars and include structured error details).

Then redeploy both edge functions.

