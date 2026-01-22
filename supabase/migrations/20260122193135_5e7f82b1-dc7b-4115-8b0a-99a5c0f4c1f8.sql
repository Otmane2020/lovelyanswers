-- Add GSC indexing columns to articles table
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS gsc_indexed BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gsc_indexed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS gsc_index_error TEXT;