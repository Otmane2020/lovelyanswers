
-- Create site_audits table to persist audit results
CREATE TABLE public.site_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  page_title TEXT,
  email TEXT,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_audits ENABLE ROW LEVEL SECURITY;

-- Public read access by ID (anyone with the link can view their audit)
CREATE POLICY "Anyone can view audits by id"
ON public.site_audits
FOR SELECT
USING (true);

-- Service role inserts only (edge functions)
-- No INSERT policy needed for anon/authenticated - edge functions use service role
