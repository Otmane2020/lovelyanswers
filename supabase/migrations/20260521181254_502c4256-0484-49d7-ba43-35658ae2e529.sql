
-- Campaigns
CREATE TABLE public.adsflow_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT 'traffic',
  status TEXT NOT NULL DEFAULT 'draft',
  budget_type TEXT NOT NULL DEFAULT 'daily',
  budget_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  bid_strategy TEXT DEFAULT 'lowest_cost',
  special_ad_category TEXT DEFAULT 'none',
  cbo_enabled BOOLEAN DEFAULT false,
  ab_test_enabled BOOLEAN DEFAULT false,
  ad_schedule_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.adsflow_ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.adsflow_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  targeting_json JSONB DEFAULT '{}'::jsonb,
  placements_json JSONB DEFAULT '{}'::jsonb,
  budget NUMERIC(12,2) DEFAULT 0,
  optimization_goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.adsflow_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_set_id UUID NOT NULL REFERENCES public.adsflow_ad_sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'single_image',
  status TEXT NOT NULL DEFAULT 'draft',
  copy_json JSONB DEFAULT '{}'::jsonb,
  media_url TEXT,
  cta TEXT DEFAULT 'learn_more',
  destination_url TEXT,
  fb_page_id TEXT,
  ig_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.adsflow_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'saved',
  size_estimate BIGINT DEFAULT 0,
  config_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.adsflow_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  dimensions TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.adsflow_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_adsflow_campaigns_user ON public.adsflow_campaigns(user_id);
CREATE INDEX idx_adsflow_ad_sets_campaign ON public.adsflow_ad_sets(campaign_id);
CREATE INDEX idx_adsflow_ads_adset ON public.adsflow_ads(ad_set_id);
CREATE INDEX idx_adsflow_metrics_entity ON public.adsflow_performance_metrics(entity_type, entity_id, date);

ALTER TABLE public.adsflow_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adsflow_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adsflow_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adsflow_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adsflow_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adsflow_performance_metrics ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'adsflow_campaigns','adsflow_ad_sets','adsflow_ads',
    'adsflow_audiences','adsflow_creatives','adsflow_performance_metrics'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "own_select" ON public.%I FOR SELECT USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own_insert" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own_update" ON public.%I FOR UPDATE USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own_delete" ON public.%I FOR DELETE USING (auth.uid() = user_id)', t);
  END LOOP;
END $$;

CREATE TRIGGER adsflow_campaigns_updated BEFORE UPDATE ON public.adsflow_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER adsflow_ad_sets_updated BEFORE UPDATE ON public.adsflow_ad_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER adsflow_ads_updated BEFORE UPDATE ON public.adsflow_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER adsflow_audiences_updated BEFORE UPDATE ON public.adsflow_audiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
