
-- Add project_id to site_audits
ALTER TABLE public.site_audits ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_site_audits_project_id ON public.site_audits(project_id);

-- Add RLS policy for project owners to see their audits
CREATE POLICY "Users can view their project audits"
ON public.site_audits FOR SELECT
USING (
  project_id IS NULL 
  OR project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert audits for their projects"
ON public.site_audits FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);
