
ALTER TABLE public.meta_ad_accounts
  ADD COLUMN IF NOT EXISTS page_id text,
  ADD COLUMN IF NOT EXISTS page_name text,
  ADD COLUMN IF NOT EXISTS instagram_actor_id text;

ALTER TABLE public.meta_pixels
  ADD COLUMN IF NOT EXISTS is_capi_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_fired_at timestamptz;
