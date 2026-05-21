
-- Meta ad accounts
CREATE TABLE public.meta_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  business_id text,
  name text,
  currency text,
  timezone text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, account_id)
);

CREATE TABLE public.meta_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pixel_id text NOT NULL,
  name text,
  code_snippet text,
  ga4_measurement_id text,
  ga4_linked boolean NOT NULL DEFAULT false,
  installed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, pixel_id)
);

CREATE TABLE public.meta_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  account_id text NOT NULL,
  name text,
  objective text,
  status text,
  daily_budget numeric,
  lifetime_budget numeric,
  spend numeric DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions integer DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  start_time timestamptz,
  stop_time timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, campaign_id)
);

CREATE TABLE public.meta_adsets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  adset_id text NOT NULL,
  name text,
  status text,
  daily_budget numeric,
  targeting jsonb DEFAULT '{}'::jsonb,
  optimization_goal text,
  billing_event text,
  spend numeric DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, adset_id)
);

CREATE TABLE public.meta_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  adset_id text NOT NULL,
  ad_id text NOT NULL,
  name text,
  status text,
  creative jsonb DEFAULT '{}'::jsonb,
  preview_url text,
  spend numeric DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, ad_id)
);

CREATE TABLE public.meta_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admin full access meta_ad_accounts" ON public.meta_ad_accounts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access meta_pixels" ON public.meta_pixels FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access meta_campaigns" ON public.meta_campaigns FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access meta_adsets" ON public.meta_adsets FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access meta_ads" ON public.meta_ads FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access meta_ai_recommendations" ON public.meta_ai_recommendations FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Project owners can view their own pixel snippet (so they can install it)
CREATE POLICY "Project owners view their pixel" ON public.meta_pixels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = meta_pixels.project_id AND p.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_meta_campaigns_project ON public.meta_campaigns(project_id);
CREATE INDEX idx_meta_adsets_project ON public.meta_adsets(project_id);
CREATE INDEX idx_meta_ads_project ON public.meta_ads(project_id);
CREATE INDEX idx_meta_pixels_project ON public.meta_pixels(project_id);

-- updated_at triggers
CREATE TRIGGER meta_ad_accounts_updated BEFORE UPDATE ON public.meta_ad_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_pixels_updated BEFORE UPDATE ON public.meta_pixels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
