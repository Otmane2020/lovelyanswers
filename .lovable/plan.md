

## Fix: Sitelink "Invalid JSON payload" Error

### Root Cause

In `supabase/functions/optimize-pmax/index.ts` (lines 566-577), the sitelink creation payload incorrectly nests `finalUrls` inside `sitelinkAsset`. In the Google Ads API v22, `finalUrls` is a top-level field on the `Asset` resource, not on `SitelinkAsset`.

### Current (broken)
```text
{
  sitelinkAsset: {
    linkText: "...",
    finalUrls: ["..."],       <-- WRONG: not a SitelinkAsset field
    description1: "...",
    description2: "...",
  }
}
```

### Fixed
```text
{
  finalUrls: ["..."],          <-- Correct: top-level Asset field
  sitelinkAsset: {
    linkText: "...",
    description1: "...",
    description2: "...",
  }
}
```

### Changes

**File: `supabase/functions/optimize-pmax/index.ts`** (lines 566-577)

Restructure the sitelink asset creation payload so `finalUrls` is at the asset level:

```typescript
const payload: Record<string, unknown> = {
  finalUrls: [sl.finalUrl || websiteUrl],
  sitelinkAsset: {
    linkText: cut(String(sl.text || "").trim(), 25),
  },
};
if (sl.description1) (payload.sitelinkAsset as any).description1 = cut(String(sl.description1).trim(), 35);
if (sl.description2) (payload.sitelinkAsset as any).description2 = cut(String(sl.description2).trim(), 35);
```

Then redeploy the `optimize-pmax` edge function.
