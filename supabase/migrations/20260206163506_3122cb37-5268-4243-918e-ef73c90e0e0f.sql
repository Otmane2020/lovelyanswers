-- Allow admins to view all credits
CREATE POLICY "Admins can view all credits"
ON public.credits
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all projects
CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
USING (public.is_admin(auth.uid()));
