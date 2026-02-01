-- Create table to store onboarding sessions for conversion recovery
CREATE TABLE public.onboarding_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  visitor_id TEXT,
  
  -- Step data
  current_step INTEGER DEFAULT 1,
  website_url TEXT,
  language TEXT,
  email TEXT,
  
  -- Analysis data (stored progressively)
  brand_name TEXT,
  business_description TEXT,
  cms TEXT,
  competitors TEXT[],
  keywords JSONB,
  traffic_potential INTEGER,
  
  -- Tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  device_type TEXT,
  
  -- Conversion status
  completed_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  checkout_started_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts and updates (for tracking before auth)
CREATE POLICY "Allow anonymous insert for onboarding_sessions"
ON public.onboarding_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anonymous update for onboarding_sessions"
ON public.onboarding_sessions FOR UPDATE
USING (true);

CREATE POLICY "Allow anonymous select for onboarding_sessions"
ON public.onboarding_sessions FOR SELECT
USING (true);

-- Index for email recovery campaigns
CREATE INDEX idx_onboarding_sessions_email ON public.onboarding_sessions(email) WHERE email IS NOT NULL;
CREATE INDEX idx_onboarding_sessions_created ON public.onboarding_sessions(created_at);
CREATE INDEX idx_onboarding_sessions_incomplete ON public.onboarding_sessions(current_step, completed_at) WHERE completed_at IS NULL;

-- Trigger to update updated_at
CREATE TRIGGER update_onboarding_sessions_updated_at
BEFORE UPDATE ON public.onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();