-- publish-geo-content and publish-shopping-products both caught CMS publish
-- errors and then unconditionally marked the content "published" anyway —
-- a false-positive that made a real failure invisible. Fixing that requires
-- somewhere to put the real error instead of silently dropping it.
alter table public.geo_contents add column if not exists publish_error text;
alter table public.shopping_products add column if not exists publish_error text;
alter table public.articles add column if not exists publish_error text;
