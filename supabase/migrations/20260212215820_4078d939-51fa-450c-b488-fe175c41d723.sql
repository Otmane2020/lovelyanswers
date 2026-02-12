
-- User connections table for Google Ads OAuth
CREATE TABLE IF NOT EXISTS public.user_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'google_ads',
  status TEXT NOT NULL DEFAULT 'connected',
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own connections" ON public.user_connections FOR ALL USING (auth.uid() = user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_connections_type ON public.user_connections(user_id, connection_type);

-- Sync status table
CREATE TABLE IF NOT EXISTS public.sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  auto_sync_enabled BOOLEAN DEFAULT false,
  last_full_sync_at TIMESTAMPTZ,
  last_full_sync_status TEXT,
  last_full_sync_error TEXT,
  total_campaigns INTEGER DEFAULT 0,
  total_keywords INTEGER DEFAULT 0,
  total_ads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sync status" ON public.sync_status FOR ALL USING (auth.uid() = user_id);

-- Campaigns sync table
CREATE TABLE IF NOT EXISTS public.campaigns_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_campaign_id TEXT NOT NULL,
  google_customer_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'UNKNOWN',
  primary_status TEXT,
  primary_status_reasons TEXT[],
  advertising_channel_type TEXT,
  bidding_strategy_type TEXT,
  budget_resource_name TEXT,
  budget_amount_micros BIGINT,
  network_settings JSONB,
  spend_7d NUMERIC DEFAULT 0,
  clicks_7d INTEGER DEFAULT 0,
  impressions_7d INTEGER DEFAULT 0,
  conversions_7d NUMERIC DEFAULT 0,
  revenue_7d NUMERIC DEFAULT 0,
  ctr_7d NUMERIC DEFAULT 0,
  cpc_7d NUMERIC DEFAULT 0,
  roas_7d NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own campaigns sync" ON public.campaigns_sync FOR ALL USING (auth.uid() = user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_sync_unique ON public.campaigns_sync(user_id, google_campaign_id);

-- Keywords sync table
CREATE TABLE IF NOT EXISTS public.keywords_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_sync_id UUID REFERENCES public.campaigns_sync(id) ON DELETE CASCADE,
  google_keyword_id TEXT NOT NULL,
  google_ad_group_id TEXT,
  ad_group_name TEXT,
  keyword_text TEXT NOT NULL DEFAULT '',
  match_type TEXT,
  status TEXT,
  quality_score INTEGER,
  quality_score_creative TEXT,
  quality_score_landing TEXT,
  quality_score_expected_ctr TEXT,
  cpc_bid_micros BIGINT,
  effective_cpc_bid_micros BIGINT,
  system_serving_status TEXT,
  approval_status TEXT,
  first_page_cpc_micros BIGINT,
  top_of_page_cpc_micros BIGINT,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  cost_micros BIGINT DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  conversions_value NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.keywords_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own keywords sync" ON public.keywords_sync FOR ALL USING (auth.uid() = user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_sync_unique ON public.keywords_sync(user_id, google_keyword_id);

-- Ads sync table
CREATE TABLE IF NOT EXISTS public.ads_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_sync_id UUID REFERENCES public.campaigns_sync(id) ON DELETE CASCADE,
  google_ad_id TEXT NOT NULL,
  google_ad_group_id TEXT,
  ad_group_name TEXT,
  ad_type TEXT,
  status TEXT,
  headlines JSONB,
  descriptions JSONB,
  final_urls TEXT[],
  path1 TEXT,
  path2 TEXT,
  ad_strength TEXT,
  ad_strength_reasons JSONB,
  policy_summary JSONB,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  cost_micros BIGINT DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  conversions_value NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ads_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ads sync" ON public.ads_sync FOR ALL USING (auth.uid() = user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ads_sync_unique ON public.ads_sync(user_id, google_ad_id);

-- Performance history table
CREATE TABLE IF NOT EXISTS public.performance_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_sync_id UUID REFERENCES public.campaigns_sync(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spend NUMERIC DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  cpa NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own perf history" ON public.performance_history FOR ALL USING (auth.uid() = user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_perf_history_unique ON public.performance_history(campaign_sync_id, date);
