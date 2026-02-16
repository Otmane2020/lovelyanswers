

## Add Promotions, Prices, Calls, and Structured Snippets to PMax

Currently the PMax system fetches and displays these extension types in the diagnostic grid, but cannot create them. This plan adds full support for creating all 4 via AI optimization and the campaign creation dialog.

---

### 1. Backend: `optimize-pmax/index.ts` -- Add AI generation + creation for new extensions

**AI Prompt Update** (in the `optimize` action):
- Add gap detection for promotions, prices, structured snippets (calls already handled via `needPhone`)
- Extend the AI prompt to request these new asset types:
  - `promotions`: array of `{promotionTarget, moneyOff/percentOff, occasion, finalUrl}`
  - `structuredSnippets`: array of `{header, values[]}` (headers like "Services", "Types", "Brands")
  - `prices`: array of `{type, header, description, price, unit, finalUrl}`
  - `phone`: `{number, country}` (already exists but gated behind `optimizeOptions.phone`)

**Asset Creation Logic** (after existing callouts/sitelinks blocks):
- **Promotions**: Create `promotionAsset` then link as `campaignAsset` with `fieldType: "PROMOTION"`
- **Structured Snippets**: Create `structuredSnippetAsset` then link as `campaignAsset` with `fieldType: "STRUCTURED_SNIPPET"`
- **Prices**: Create `priceAsset` then link as `campaignAsset` with `fieldType: "PRICE"`
- **Calls**: Already implemented -- just enable by default (remove the `optimizeOptions.phone` gate, or pass it from frontend)

---

### 2. Backend: `manage-pmax-service/index.ts` -- Add creation support in campaign builder

**Extend `PmaxParams` interface** with:
- `promotions?: {promotionTarget: string, discountModifier?: string, moneyAmountOff?: {currencyCode: string, amountMicros: string}, percentOff?: number, occasion?: string, finalUrl?: string}[]`
- `structuredSnippets?: {header: string, values: string[]}[]`
- `prices?: {type: string, priceOfferings: {header: string, description?: string, price: {currencyCode: string, amountMicros: string}, unit?: string, finalUrl: string}[]}[]`
- `phoneNumber?: string`
- `phoneCountry?: string`

**Post-atomic creation** (after callouts block):
- Loop through promotions, create `promotionAsset`, link to campaign
- Loop through structured snippets, create `structuredSnippetAsset`, link to campaign
- Loop through prices, create `priceAsset`, link to campaign
- If phoneNumber provided, create `callAsset`, link to campaign

---

### 3. Frontend: `CreatePmaxCampaignDialog.tsx` -- Add UI fields

Add new sections after the existing "Callouts" section:
- **Promotions**: Textarea for promotion targets (1 per line) with optional discount fields
- **Prices**: Textarea for price items
- **Calls**: Single input for phone number + country select
- **Structured Snippets**: Header select (Services, Types, Brands, etc.) + textarea for values

Pass these new fields to the `manage-pmax-service` edge function body.

Also update the AI generation handler (`handleAIGenerate`) to populate these fields from the `generate-google-ads` response.

---

### 4. Frontend: `GoogleAdsManager.tsx` -- Enable optimization options

Update the `handleOptimizePmax` call to pass optimization flags:
- `phone: true` (enable phone creation)
- `promotions: true`
- `structuredSnippets: true`
- `prices: true`

---

### 5. Backend: `generate-google-ads/index.ts` -- AI pre-fill for new extensions

Update the PMax generation prompt to also return:
- `promotions`, `structuredSnippets`, `prices`, `phoneNumber`, `phoneCountry`

---

### Technical Notes

- Google Ads API v22 asset types used:
  - `promotionAsset`: `promotionTarget` (required), `discountModifier`, `moneyAmountOff`, `percentOff`, `occasion`
  - `structuredSnippetAsset`: `header` (predefined: Amenities, Brands, Courses, etc.), `values[]`
  - `priceAsset`: `type` (BRANDS, EVENTS, LOCATIONS, etc.), `priceQualifier`, `priceOfferings[]`
  - `callAsset`: `phoneNumber`, `countryCode` (already implemented)
- All new extensions are campaign-level assets (not asset-group-level)
- Each extension type has its own `fieldType` for `campaignAssets` linking

### Files Modified

1. `supabase/functions/optimize-pmax/index.ts` -- AI prompt + creation logic for 4 new types
2. `supabase/functions/manage-pmax-service/index.ts` -- Creation support in campaign builder
3. `src/components/admin/ads/CreatePmaxCampaignDialog.tsx` -- UI fields for new extensions
4. `src/components/admin/GoogleAdsManager.tsx` -- Pass optimization flags
5. `supabase/functions/generate-google-ads/index.ts` -- AI pre-fill for new extensions

