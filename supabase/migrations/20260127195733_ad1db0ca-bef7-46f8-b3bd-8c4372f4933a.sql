-- Create local_businesses table for storing selected business per project
CREATE TABLE public.local_businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating NUMERIC,
  review_count INTEGER,
  types TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Create local_answers table for storing generated local Q&A
CREATE TABLE public.local_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  scheduled_date DATE,
  published_at TIMESTAMP WITH TIME ZONE,
  published_url TEXT,
  slug TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(slug)
);

-- Enable RLS on both tables
ALTER TABLE public.local_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for local_businesses
CREATE POLICY "Users can view their project local businesses"
  ON public.local_businesses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = local_businesses.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create local businesses for their projects"
  ON public.local_businesses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = local_businesses.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their project local businesses"
  ON public.local_businesses FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = local_businesses.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their project local businesses"
  ON public.local_businesses FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = local_businesses.project_id AND projects.user_id = auth.uid()
  ));

-- RLS policies for local_answers
CREATE POLICY "Users can view their project local answers"
  ON public.local_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = local_answers.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create local answers for their projects"
  ON public.local_answers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = local_answers.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their project local answers"
  ON public.local_answers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = local_answers.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their project local answers"
  ON public.local_answers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = local_answers.project_id AND projects.user_id = auth.uid()
  ));

-- Public access policy for published local answers
CREATE POLICY "Anyone can view public local answers"
  ON public.local_answers FOR SELECT
  USING (is_public = true);

-- Create trigger for updated_at on local_answers
CREATE TRIGGER update_local_answers_updated_at
  BEFORE UPDATE ON public.local_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();