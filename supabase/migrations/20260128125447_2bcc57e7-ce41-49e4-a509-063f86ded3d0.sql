-- Allow anonymous users to read projects that have public answers (needed for blog page join)
CREATE POLICY "Anyone can view projects with public answers" 
ON public.projects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.answers 
    WHERE answers.project_id = projects.id 
    AND answers.is_public = true
  )
);