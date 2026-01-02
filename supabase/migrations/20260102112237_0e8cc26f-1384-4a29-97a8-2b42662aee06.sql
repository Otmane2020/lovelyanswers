-- Add published_url column to track external publication URLs
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS published_url text;

-- Add published_at column to track when the answer was published
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;