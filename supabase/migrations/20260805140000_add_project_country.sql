-- Onboarding now collects a target country (auto-detected from the
-- browser locale, editable in a dropdown) so DataForSEO calls can be
-- targeted at the right locale. There was no column to persist it —
-- the value only ever lived in transient client state.
alter table public.projects
  add column if not exists country text;

comment on column public.projects.country is
  'ISO 3166-1 alpha-2 country code, used to pick the right DataForSEO location_code for competitor/keyword analysis.';

-- The onboarding scrape already detects the platform a site is built on
-- (WooCommerce, Shopify, Lovable, Replit, ...) but had nowhere to persist
-- it, so the "Connect your website" step couldn't pre-select the right
-- platform later.
alter table public.projects
  add column if not exists detected_cms text;

comment on column public.projects.detected_cms is
  'Platform detected from the site during onboarding (e.g. WooCommerce, Shopify, Lovable, Replit) — used to pre-select the CMS connect flow. Not authoritative: a custom domain or unrecognized builder leaves this null.';
