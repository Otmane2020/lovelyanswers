-- 1. Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Anyone can view projects with public answers" ON public.projects;

-- 2. Create a SECURITY DEFINER function to break the recursion
CREATE OR REPLACE FUNCTION public.project_has_public_answers(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.answers
    WHERE project_id = p_project_id
    AND is_public = true
  )
$$;

-- 3. Recreate the policy using the function (avoids RLS recursion)
CREATE POLICY "Anyone can view projects with public answers" 
ON public.projects 
FOR SELECT 
USING (public.project_has_public_answers(id));