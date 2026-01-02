-- Add missing columns to articles table for AEO article generation
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS html_content text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS keywords text[],
ADD COLUMN IF NOT EXISTS aeo_score integer,
ADD COLUMN IF NOT EXISTS scheduled_date timestamp with time zone;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);

-- Create index on scheduled_date for calendar queries
CREATE INDEX IF NOT EXISTS idx_articles_scheduled_date ON public.articles(scheduled_date);

-- Add scheduled_date column to answers for planning calendar
ALTER TABLE public.answers 
ADD COLUMN IF NOT EXISTS scheduled_date timestamp with time zone;