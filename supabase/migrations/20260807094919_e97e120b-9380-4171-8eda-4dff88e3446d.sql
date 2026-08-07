-- ============ Phase 1: schema only, no functional change ============

-- 1. Onboarding state on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS onboarding_progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_last_error text,
  ADD COLUMN IF NOT EXISTS onboarding_updated_at timestamptz;

-- 2. site_pages: strategic page storage
ALTER TABLE public.site_pages
  ADD COLUMN IF NOT EXISTS page_type text,
  ADD COLUMN IF NOT EXISTS normalized_url text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS headings jsonb,
  ADD COLUMN IF NOT EXISTS word_count integer,
  ADD COLUMN IF NOT EXISTS lang text,
  ADD COLUMN IF NOT EXISTS scraped_at timestamptz;

UPDATE public.site_pages
SET normalized_url = lower(regexp_replace(split_part(split_part(url, '?', 1), '#', 1), '/+$', ''))
WHERE normalized_url IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS site_pages_project_normalized_url_key
  ON public.site_pages (project_id, normalized_url)
  WHERE normalized_url IS NOT NULL;

-- 3. keywords: DataForSEO enrichment
ALTER TABLE public.keywords
  ADD COLUMN IF NOT EXISTS cpc numeric,
  ADD COLUMN IF NOT EXISTS serp_domains jsonb,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS cluster text,
  ADD COLUMN IF NOT EXISTS is_question boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

-- 4. project_context (snapshot cache)
CREATE TABLE IF NOT EXISTS public.project_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_version integer NOT NULL DEFAULT 1,
  readiness text NOT NULL DEFAULT 'unknown',
  stale boolean NOT NULL DEFAULT true,
  refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_context TO authenticated;
GRANT ALL ON public.project_context TO service_role;
ALTER TABLE public.project_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their project context"
ON public.project_context FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_context.project_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_context.project_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_project_context_updated_at
BEFORE UPDATE ON public.project_context
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. content_topics (anti-duplication)
CREATE TABLE IF NOT EXISTS public.content_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  topic text NOT NULL,
  primary_keyword text,
  angle text,
  topic_fingerprint text NOT NULL,
  scheduled_date date,
  content_id uuid,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS content_topics_project_type_fingerprint_key
  ON public.content_topics (project_id, content_type, topic_fingerprint);
CREATE INDEX IF NOT EXISTS content_topics_project_date_idx
  ON public.content_topics (project_id, scheduled_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_topics TO authenticated;
GRANT ALL ON public.content_topics TO service_role;
ALTER TABLE public.content_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their content topics"
ON public.content_topics FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = content_topics.project_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = content_topics.project_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_content_topics_updated_at
BEFORE UPDATE ON public.content_topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();