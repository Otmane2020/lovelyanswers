-- Create published_articles table for external article publishing
CREATE TABLE public.published_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  source_id TEXT,
  meta_description TEXT,
  author TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.published_articles ENABLE ROW LEVEL SECURITY;

-- Public read access for all published articles
CREATE POLICY "Anyone can view published articles"
ON public.published_articles
FOR SELECT
USING (true);

-- Only service role can insert (via edge function)
-- No INSERT/UPDATE/DELETE policies for authenticated users