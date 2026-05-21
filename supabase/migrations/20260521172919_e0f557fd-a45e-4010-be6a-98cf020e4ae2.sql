
-- Enrich meta_adsets
ALTER TABLE public.meta_adsets
  ADD COLUMN IF NOT EXISTS lifetime_budget numeric,
  ADD COLUMN IF NOT EXISTS bid_amount numeric,
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS ctr numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpc numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversions numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roas numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpa numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS targeting_summary text;

-- Enrich meta_ads
ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS ctr numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpc numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversions numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roas numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS campaign_id text;

-- Enrich meta_pixels
ALTER TABLE public.meta_pixels
  ADD COLUMN IF NOT EXISTS gtm_pushed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lovable_injected boolean NOT NULL DEFAULT false;

-- meta_creatives
CREATE TABLE IF NOT EXISTS public.meta_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  media_url text NOT NULL,
  image_hash text,
  video_id text,
  title text,
  body text,
  cta_type text DEFAULT 'LEARN_MORE',
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_creatives_project ON public.meta_creatives(project_id);
ALTER TABLE public.meta_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access meta_creatives" ON public.meta_creatives
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- meta_audiences
CREATE TABLE IF NOT EXISTS public.meta_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  audience_id text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  subtype text,
  approximate_count bigint DEFAULT 0,
  source_audience_id text,
  rule jsonb DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, audience_id)
);
CREATE INDEX IF NOT EXISTS idx_meta_audiences_project ON public.meta_audiences(project_id);
ALTER TABLE public.meta_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access meta_audiences" ON public.meta_audiences
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- meta_conversions_events
CREATE TABLE IF NOT EXISTS public.meta_conversions_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pixel_id text NOT NULL,
  event_name text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  event_id text,
  user_data jsonb DEFAULT '{}'::jsonb,
  custom_data jsonb DEFAULT '{}'::jsonb,
  action_source text DEFAULT 'website',
  event_source_url text,
  test_event boolean DEFAULT false,
  sent_at timestamptz,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_conv_events_project ON public.meta_conversions_events(project_id);
CREATE INDEX IF NOT EXISTS idx_meta_conv_events_pixel ON public.meta_conversions_events(pixel_id);
ALTER TABLE public.meta_conversions_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access meta_conv_events" ON public.meta_conversions_events
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- meta_roas_snapshots
CREATE TABLE IF NOT EXISTS public.meta_roas_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('campaign','adset','ad','account')),
  ref_id text NOT NULL,
  ref_name text,
  snapshot_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  spend numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  roas numeric DEFAULT 0,
  cpa numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, level, ref_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_meta_roas_project_date ON public.meta_roas_snapshots(project_id, snapshot_date);
ALTER TABLE public.meta_roas_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access meta_roas" ON public.meta_roas_snapshots
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- meta_optimization_settings
CREATE TABLE IF NOT EXISTS public.meta_optimization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  auto_apply boolean NOT NULL DEFAULT false,
  min_roas numeric NOT NULL DEFAULT 1.5,
  min_spend numeric NOT NULL DEFAULT 50,
  lookback_days int NOT NULL DEFAULT 14,
  cron_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meta_optimization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access meta_opt_settings" ON public.meta_optimization_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- meta_optimization_runs
CREATE TABLE IF NOT EXISTS public.meta_optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ran_at timestamptz NOT NULL DEFAULT now(),
  dry_run boolean NOT NULL DEFAULT true,
  summary text,
  actions jsonb DEFAULT '[]'::jsonb,
  applied_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_opt_runs_project ON public.meta_optimization_runs(project_id, ran_at DESC);
ALTER TABLE public.meta_optimization_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access meta_opt_runs" ON public.meta_optimization_runs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- lovable_managed_pixels (which projects auto-inject their pixel)
CREATE TABLE IF NOT EXISTS public.lovable_managed_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  pixel_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lovable_managed_pixels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access lovable_pixels" ON public.lovable_managed_pixels
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Project owners view lovable_pixels" ON public.lovable_managed_pixels
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = lovable_managed_pixels.project_id AND p.user_id = auth.uid()));

-- Storage bucket for ad creatives
INSERT INTO storage.buckets (id, name, public)
VALUES ('meta-creatives', 'meta-creatives', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read meta-creatives" ON storage.objects
  FOR SELECT USING (bucket_id = 'meta-creatives');
CREATE POLICY "Admin upload meta-creatives" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'meta-creatives' AND is_admin());
CREATE POLICY "Admin delete meta-creatives" ON storage.objects
  FOR DELETE USING (bucket_id = 'meta-creatives' AND is_admin());
