-- Allow public (anonymous) access to published answers for the public answer pages
CREATE POLICY "Anyone can view public answers" 
ON public.answers 
FOR SELECT 
USING (is_public = true);