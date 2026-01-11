-- Add column to store selected GSC domain per project
ALTER TABLE public.project_settings 
ADD COLUMN IF NOT EXISTS gsc_selected_domain TEXT;

-- Add column to store selected analysis period
ALTER TABLE public.project_settings 
ADD COLUMN IF NOT EXISTS gsc_analysis_period INTEGER DEFAULT 30;

-- Create table for caching GSC data if not exists
CREATE TABLE IF NOT EXISTS public.google_search_console_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(10,4) DEFAULT 0,
  position NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, domain, date)
);

-- Enable RLS on GSC data table
ALTER TABLE public.google_search_console_data ENABLE ROW LEVEL SECURITY;

-- Create policies for GSC data
CREATE POLICY "Users can view their own GSC data" 
ON public.google_search_console_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GSC data" 
ON public.google_search_console_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GSC data" 
ON public.google_search_console_data 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_gsc_data_user_domain_date 
ON public.google_search_console_data(user_id, domain, date DESC);