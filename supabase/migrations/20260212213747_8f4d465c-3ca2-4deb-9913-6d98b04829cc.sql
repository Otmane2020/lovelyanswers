
-- Google Ads accounts linked via OAuth
CREATE TABLE public.google_ads_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id TEXT NOT NULL,
  account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_ads_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage google ads accounts"
ON public.google_ads_accounts FOR ALL
USING (public.is_admin());

-- Campaigns
CREATE TABLE public.google_ads_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.google_ads_accounts(id) ON DELETE CASCADE,
  google_campaign_id TEXT,
  name TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'SEARCH',
  status TEXT DEFAULT 'draft',
  budget_amount NUMERIC,
  budget_currency TEXT DEFAULT 'EUR',
  bidding_strategy TEXT DEFAULT 'MAXIMIZE_CONVERSIONS',
  target_locations TEXT[],
  target_languages TEXT[],
  start_date DATE,
  end_date DATE,
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_ads_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns"
ON public.google_ads_campaigns FOR ALL
USING (public.is_admin());

-- Ad Groups
CREATE TABLE public.google_ads_ad_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.google_ads_campaigns(id) ON DELETE CASCADE,
  google_ad_group_id TEXT,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  cpc_bid NUMERIC,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_ads_ad_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad groups"
ON public.google_ads_ad_groups FOR ALL
USING (public.is_admin());

-- Ads (Responsive Search Ads)
CREATE TABLE public.google_ads_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_group_id UUID NOT NULL REFERENCES public.google_ads_ad_groups(id) ON DELETE CASCADE,
  google_ad_id TEXT,
  headlines TEXT[] NOT NULL DEFAULT '{}',
  descriptions TEXT[] NOT NULL DEFAULT '{}',
  final_urls TEXT[] NOT NULL DEFAULT '{}',
  path1 TEXT,
  path2 TEXT,
  status TEXT DEFAULT 'draft',
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_ads_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ads"
ON public.google_ads_ads FOR ALL
USING (public.is_admin());

-- Keywords (positive and negative)
CREATE TABLE public.google_ads_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_group_id UUID NOT NULL REFERENCES public.google_ads_ad_groups(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  match_type TEXT DEFAULT 'BROAD',
  is_negative BOOLEAN DEFAULT false,
  cpc_bid NUMERIC,
  status TEXT DEFAULT 'draft',
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_ads_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage keywords"
ON public.google_ads_keywords FOR ALL
USING (public.is_admin());

-- Triggers for updated_at
CREATE TRIGGER update_google_ads_accounts_updated_at BEFORE UPDATE ON public.google_ads_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_ads_campaigns_updated_at BEFORE UPDATE ON public.google_ads_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_ads_ad_groups_updated_at BEFORE UPDATE ON public.google_ads_ad_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_ads_ads_updated_at BEFORE UPDATE ON public.google_ads_ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_ads_keywords_updated_at BEFORE UPDATE ON public.google_ads_keywords FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
