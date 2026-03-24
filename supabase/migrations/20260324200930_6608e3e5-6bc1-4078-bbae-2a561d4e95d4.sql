
-- Tracked Queries table
CREATE TABLE public.tracked_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('perplexity', 'gemini', 'bing', 'google_sge')),
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, query, platform)
);

ALTER TABLE public.tracked_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access tracked queries via project" ON public.tracked_queries
  FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- Mentions table
CREATE TABLE public.mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  query_id uuid REFERENCES public.tracked_queries(id) ON DELETE CASCADE,
  platform text NOT NULL,
  query_text text NOT NULL,
  raw_response text NOT NULL,
  snippet text,
  brand_mentioned boolean DEFAULT false,
  brand_position int,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score float,
  competitors_mentioned text[] DEFAULT '{}',
  sources jsonb DEFAULT '[]',
  queried_at timestamptz DEFAULT now()
);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access mentions via project" ON public.mentions
  FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE INDEX idx_mentions_project ON public.mentions(project_id);
CREATE INDEX idx_mentions_platform ON public.mentions(platform);
CREATE INDEX idx_mentions_queried_at ON public.mentions(queried_at DESC);
CREATE INDEX idx_mentions_brand ON public.mentions(brand_mentioned);

-- Visibility Scores table
CREATE TABLE public.visibility_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  score float NOT NULL,
  citation_rate float,
  avg_position float,
  total_queries int,
  brand_mentions int,
  positive_count int,
  neutral_count int,
  negative_count int,
  UNIQUE(project_id, platform, date)
);

ALTER TABLE public.visibility_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access visibility scores via project" ON public.visibility_scores
  FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE INDEX idx_scores_project_date ON public.visibility_scores(project_id, date DESC);

-- Add brand_names column to projects if not exists
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand_names text[] DEFAULT '{}';
