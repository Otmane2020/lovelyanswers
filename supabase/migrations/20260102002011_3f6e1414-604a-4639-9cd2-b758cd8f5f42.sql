-- Create keywords table for storing extracted keywords from URLs
CREATE TABLE public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  source_url TEXT,
  search_volume INTEGER,
  difficulty INTEGER,
  intent TEXT,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their project keywords"
ON public.keywords FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = keywords.project_id 
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create keywords for their projects"
ON public.keywords FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = keywords.project_id 
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update their project keywords"
ON public.keywords FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = keywords.project_id 
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their project keywords"
ON public.keywords FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = keywords.project_id 
  AND projects.user_id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_keywords_project_id ON public.keywords(project_id);
CREATE INDEX idx_keywords_is_used ON public.keywords(is_used);

-- Trigger for updated_at
CREATE TRIGGER update_keywords_updated_at
BEFORE UPDATE ON public.keywords
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();