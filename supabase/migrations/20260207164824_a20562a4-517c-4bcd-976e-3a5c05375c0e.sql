
-- Add GSC indexing tracking columns to published_articles
ALTER TABLE public.published_articles 
ADD COLUMN IF NOT EXISTS gsc_indexed boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gsc_indexed_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gsc_index_error text DEFAULT NULL;
