-- parse-shopping-feed used a plain INSERT with no dedup, so re-syncing the
-- same feed created full duplicate rows every time (and a new shopping_feeds
-- row on top). Dedupe first (keep the most recently updated row per
-- project+feed item), then enforce it going forward with a unique
-- constraint that parse-shopping-feed's UPSERT targets.
delete from public.shopping_products a
using public.shopping_products b
where a.project_id = b.project_id
  and a.feed_item_id = b.feed_item_id
  and a.feed_item_id is not null
  and a.id <> b.id
  and (a.updated_at, a.id) < (b.updated_at, b.id);

alter table public.shopping_products
  add constraint shopping_products_project_feed_item_unique
  unique (project_id, feed_item_id);

-- Google Merchant feeds routinely carry a sale price and multiple images per
-- item; the parser only ever extracted a single price/image.
alter table public.shopping_products
  add column if not exists sale_price numeric,
  add column if not exists additional_images text[];
