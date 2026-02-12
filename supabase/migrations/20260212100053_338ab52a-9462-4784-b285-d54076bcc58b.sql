
-- Fix overly permissive policy on shopping_feeds
DROP POLICY "Users can manage their project feeds" ON public.shopping_feeds;

CREATE POLICY "Users can view their project feeds"
  ON public.shopping_feeds FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their project feeds"
  ON public.shopping_feeds FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their project feeds"
  ON public.shopping_feeds FOR UPDATE
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their project feeds"
  ON public.shopping_feeds FOR DELETE
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
