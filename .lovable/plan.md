# Facebook & Instagram Ads — SuperAdmin Module

Build a Meta Ads management module mirroring the existing Google Ads admin pattern at `/superadmin/ads`, with automatic Pixel creation and Google Analytics linkage.

## 1. Secrets (Meta Marketing API)

Request via `add_secret`:
- `META_APP_ID`
- `META_APP_SECRET`
- `META_ACCESS_TOKEN` (long-lived, with `ads_management`, `ads_read`, `business_management`, `pages_show_list`)
- `META_AD_ACCOUNT_ID` (format `act_XXXXX`)

## 2. Database (migration)

```sql
-- Meta ad accounts linked per project
create table meta_ad_accounts (
  id uuid pk, project_id uuid fk, account_id text,
  business_id text, currency text, name text, status text,
  created_at, updated_at
);

-- Pixels created/managed
create table meta_pixels (
  id uuid pk, project_id uuid fk, pixel_id text,
  name text, code_snippet text, ga4_linked bool default false,
  installed_at, created_at
);

-- Cached campaigns/adsets/ads + insights snapshots
create table meta_campaigns (id, project_id, campaign_id, name, objective, status, daily_budget, spend, impressions, clicks, conversions, roas, ...);
create table meta_adsets (id, project_id, campaign_id, adset_id, name, targeting jsonb, ...);
create table meta_ads (id, project_id, adset_id, ad_id, name, creative jsonb, preview_url, ...);
```
RLS: admin-only (uses `is_admin()`).

## 3. Edge functions

- `meta-ads-sync` — pulls account, campaigns, adsets, ads + insights (last 30d) from `graph.facebook.com/v21.0`
- `meta-ads-create-campaign` — POST campaign + adset + creative + ad in one call
- `meta-ads-update-status` — pause/resume/delete
- `meta-pixel-create` — creates Pixel via `/{ad_account_id}/adspixels`, stores snippet
- `meta-pixel-link-ga4` — calls Pixel `event_source` API to attach GA4 measurement ID
- `meta-ads-ai-recommendations` — Lovable AI Gateway (Gemini Flash) audits campaigns and suggests budget/creative changes

All use `verify_jwt = true` + admin check.

## 4. UI — `src/views/SuperAdminMetaAds.tsx`

Route: `/superadmin/meta-ads` (+ `app/superadmin/meta-ads/page.tsx`).
Same `PageHeader` + `Tabs` pattern as `SuperAdminAds`:

- **Overview** — account KPIs (spend, ROAS, CPM, CTR), 30d chart
- **Campaigns** — list + create dialog (objective, budget, audience)
- **Ad Sets** — targeting (geo, age, interests via `/search?type=adinterest`)
- **Ads** — creative upload, preview, status toggle
- **Pixel & Tracking** — one-click "Create Pixel", show snippet, "Link Google Analytics" button, install-status badge
- **AI Strategy** — recommendations panel (reuse pattern from `StrategyTab`)
- **Reports** — historical insights

Components in `src/components/admin/meta-ads/` mirroring `src/components/admin/ads/`.

## 5. Sidebar entry

Add link in `AeoSidebar` / SuperAdmin section: "Meta Ads" with `Facebook` lucide icon, admin-gated via `ADMIN_EMAILS`.

## 6. Pixel injection (Lovable-managed)

Since the pixel "connexion avec Lovable" was chosen: after pixel creation, the snippet is stored in `meta_pixels.code_snippet` and surfaced in **Settings → Integrations** with a copy-button + auto-injection into the project's `index.html` `<head>` for sites hosted on Lovable (managed via a new `lovable_managed_pixels` row that the SSR layer reads).

## Out of scope (v1)
- Conversions API server-side events (can be added later)
- A/B testing automation
- Multi-account switcher (single account per project for now)

## Technical notes
- Meta Marketing API base: `https://graph.facebook.com/v21.0`
- All money fields are in account currency minor units (cents) — convert on display
- Rate limit: respect `X-Business-Use-Case-Usage` header; use 60s cache on read endpoints
- Interest targeting search is autocomplete-style (debounced)

Ready to proceed once secrets are added.