-- Drop the restrictive policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view public answers" ON public.answers;

-- Create a PERMISSIVE policy for public answers
CREATE POLICY "Anyone can view public answers" 
ON public.answers 
FOR SELECT 
USING (is_public = true);