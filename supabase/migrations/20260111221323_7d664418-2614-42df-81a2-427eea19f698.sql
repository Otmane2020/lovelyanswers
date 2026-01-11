-- Create site_pages table to store crawled URLs from sitemap
CREATE TABLE public.site_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  meta_description TEXT,
  last_crawled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, url)
);

-- Enable RLS
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

-- Create policies - users can manage pages for their own projects
CREATE POLICY "Users can view site_pages for their projects"
ON public.site_pages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = site_pages.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert site_pages for their projects"
ON public.site_pages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = site_pages.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update site_pages for their projects"
ON public.site_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = site_pages.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete site_pages for their projects"
ON public.site_pages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = site_pages.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_site_pages_project_id ON public.site_pages(project_id);

-- Add trigger for updated_at
CREATE TRIGGER update_site_pages_updated_at
BEFORE UPDATE ON public.site_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();