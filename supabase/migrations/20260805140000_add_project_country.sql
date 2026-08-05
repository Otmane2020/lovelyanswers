-- Onboarding now collects a target country (auto-detected from the
-- browser locale, editable in a dropdown) so DataForSEO calls can be
-- targeted at the right locale. There was no column to persist it —
-- the value only ever lived in transient client state.
alter table public.projects
  add column if not exists country text;

comment on column public.projects.country is
  'ISO 3166-1 alpha-2 country code, used to pick the right DataForSEO location_code for competitor/keyword analysis.';
