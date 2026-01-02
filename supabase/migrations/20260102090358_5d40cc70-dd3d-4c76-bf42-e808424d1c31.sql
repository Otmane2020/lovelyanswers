-- Create generation_settings table for storing onboarding settings used in Q/A generation
CREATE TABLE public.generation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Core settings from onboarding
  website_url TEXT NOT NULL,
  brand_name TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  business_description TEXT,
  target_audiences TEXT[] DEFAULT '{}',
  competitors TEXT[] DEFAULT '{}',
  brand_color TEXT DEFAULT '#000000',
  example_url TEXT,
  referral_source TEXT,
  
  -- Generation preferences
  tone TEXT DEFAULT 'professional',
  answer_length TEXT DEFAULT 'medium',
  include_citations BOOLEAN DEFAULT true,
  target_platforms TEXT[] DEFAULT ARRAY['chatgpt', 'gemini', 'claude'],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one settings per project
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE public.generation_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their project generation settings"
ON public.generation_settings
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = generation_settings.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create generation settings for their projects"
ON public.generation_settings
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = generation_settings.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update their project generation settings"
ON public.generation_settings
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = generation_settings.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their project generation settings"
ON public.generation_settings
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = generation_settings.project_id
  AND projects.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_generation_settings_updated_at
BEFORE UPDATE ON public.generation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Populate from existing projects
INSERT INTO public.generation_settings (
  project_id,
  website_url,
  brand_name,
  language,
  business_description,
  target_audiences,
  competitors,
  brand_color,
  example_url
)
SELECT 
  id,
  website_url,
  brand_name,
  language,
  business_description,
  CASE WHEN audience IS NOT NULL THEN ARRAY[audience] ELSE '{}' END,
  COALESCE(competitors, '{}'),
  COALESCE(brand_color, '#000000'),
  example_url
FROM public.projects
WHERE is_active = true
ON CONFLICT (project_id) DO NOTHING;