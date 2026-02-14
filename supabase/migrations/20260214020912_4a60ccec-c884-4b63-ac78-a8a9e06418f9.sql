
-- Create geo_contents table for GEO (Generative Engine Optimization) content
CREATE TABLE public.geo_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  brand TEXT NOT NULL,
  website TEXT,
  content TEXT,
  html_content TEXT,
  title TEXT,
  meta_description TEXT,
  content_type TEXT DEFAULT 'article',
  score INTEGER DEFAULT 0,
  slug TEXT,
  keywords TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  published_url TEXT,
  published_at TIMESTAMPTZ,
  scheduled_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geo_contents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their project geo contents"
  ON public.geo_contents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = geo_contents.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create geo contents for their projects"
  ON public.geo_contents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = geo_contents.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their project geo contents"
  ON public.geo_contents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = geo_contents.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their project geo contents"
  ON public.geo_contents FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = geo_contents.project_id AND projects.user_id = auth.uid()
  ));

-- Public read for published content
CREATE POLICY "Anyone can view public geo contents"
  ON public.geo_contents FOR SELECT
  USING (is_public = true);

-- Trigger for updated_at
CREATE TRIGGER update_geo_contents_updated_at
  BEFORE UPDATE ON public.geo_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
