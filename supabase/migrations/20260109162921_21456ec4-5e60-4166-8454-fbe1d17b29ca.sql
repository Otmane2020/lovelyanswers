-- Add Google OAuth columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_oauth_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS google_console_email TEXT;

-- Google Search Console domains
CREATE TABLE IF NOT EXISTS public.google_search_console_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, domain)
);

ALTER TABLE public.google_search_console_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own domains"
ON public.google_search_console_domains FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own domains"
ON public.google_search_console_domains FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains"
ON public.google_search_console_domains FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains"
ON public.google_search_console_domains FOR DELETE
USING (auth.uid() = user_id);

-- GSC Alerts for anomaly detection
CREATE TABLE IF NOT EXISTS public.gsc_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  previous_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  change_percentage NUMERIC NOT NULL,
  detection_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.gsc_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts"
ON public.gsc_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.gsc_alerts FOR UPDATE
USING (auth.uid() = user_id);

-- GSC Sync Config
CREATE TABLE IF NOT EXISTS public.gsc_sync_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  auto_sync_enabled BOOLEAN DEFAULT false,
  notification_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.gsc_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync config"
ON public.gsc_sync_config FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync config"
ON public.gsc_sync_config FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync config"
ON public.gsc_sync_config FOR UPDATE
USING (auth.uid() = user_id);