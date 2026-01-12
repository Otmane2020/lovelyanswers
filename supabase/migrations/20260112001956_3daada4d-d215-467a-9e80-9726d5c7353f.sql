-- Create visitor_sessions table for tracking all visits
CREATE TABLE public.visitor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  landing_page TEXT,
  
  -- UTM Parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Facebook specific
  fbclid TEXT,
  fb_campaign_id TEXT,
  fb_adset_id TEXT,
  fb_ad_id TEXT,
  
  -- Google specific  
  gclid TEXT,
  
  -- Session metrics
  page_views INTEGER DEFAULT 1,
  session_duration_seconds INTEGER DEFAULT 0,
  last_page TEXT,
  is_bounce BOOLEAN DEFAULT true,
  
  -- Device info
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  language TEXT,
  timezone TEXT,
  
  -- Conversion tracking
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create page_views table for detailed page tracking
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  time_on_page_seconds INTEGER DEFAULT 0,
  scroll_depth INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_visitor_sessions_visitor_id ON public.visitor_sessions(visitor_id);
CREATE INDEX idx_visitor_sessions_created_at ON public.visitor_sessions(created_at DESC);
CREATE INDEX idx_visitor_sessions_utm_source ON public.visitor_sessions(utm_source);
CREATE INDEX idx_visitor_sessions_fbclid ON public.visitor_sessions(fbclid);
CREATE INDEX idx_page_views_session_id ON public.page_views(session_id);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);

-- Enable RLS
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking (no auth required)
CREATE POLICY "Allow anonymous insert for visitor_sessions" 
ON public.visitor_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow anonymous insert for page_views" 
ON public.page_views 
FOR INSERT 
WITH CHECK (true);

-- Allow updates for session duration tracking
CREATE POLICY "Allow anonymous update for visitor_sessions" 
ON public.visitor_sessions 
FOR UPDATE 
USING (true);

-- Admin can read all data (will be handled in app logic)
CREATE POLICY "Allow anonymous select for visitor_sessions" 
ON public.visitor_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow anonymous select for page_views" 
ON public.page_views 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_visitor_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_visitor_sessions_updated_at
BEFORE UPDATE ON public.visitor_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_visitor_session_updated_at();