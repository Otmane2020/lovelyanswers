
-- Table to store AI analysis reports (persisted)
CREATE TABLE public.ads_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_type TEXT NOT NULL, -- 'keywords', 'ad_groups', 'roas', 'strategy', 'conversions', 'account_audit'
  content TEXT NOT NULL, -- full markdown content
  summary TEXT, -- short summary
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ads_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ads reports"
  ON public.ads_reports FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_ads_reports_user_type ON public.ads_reports(user_id, report_type);

-- Table to store actionable items extracted from reports
CREATE TABLE public.ads_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID REFERENCES public.ads_reports(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'pause_ad_group', 'enable_ad_group', 'add_negative_keyword', 'create_ad', 'update_bid', etc.
  target_id TEXT, -- google_ad_group_id, google_keyword_id, etc.
  target_name TEXT, -- human-readable name
  description TEXT, -- what the action does
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'skipped'
  result TEXT, -- result message after execution
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ads_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ads actions"
  ON public.ads_actions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_ads_actions_user ON public.ads_actions(user_id, status);
CREATE INDEX idx_ads_actions_report ON public.ads_actions(report_id);
