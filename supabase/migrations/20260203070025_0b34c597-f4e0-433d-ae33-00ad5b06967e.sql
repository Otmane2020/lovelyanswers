-- Fix RLS recursion for admin access checks by using SECURITY DEFINER helper

-- 1) Admin check helper (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(auth.uid());
$$;

-- 2) Ensure RLS enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_prospects ENABLE ROW LEVEL SECURITY;

-- 3) Replace policies to avoid recursive joins
DO $$
BEGIN
  -- admin_users policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_users' AND policyname='Admins can view admin users') THEN
    DROP POLICY "Admins can view admin users" ON public.admin_users;
  END IF;

  -- admin_prospects policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_prospects' AND policyname='Admins can view admin prospects') THEN
    DROP POLICY "Admins can view admin prospects" ON public.admin_prospects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_prospects' AND policyname='Admins can insert admin prospects') THEN
    DROP POLICY "Admins can insert admin prospects" ON public.admin_prospects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_prospects' AND policyname='Admins can update admin prospects') THEN
    DROP POLICY "Admins can update admin prospects" ON public.admin_prospects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_prospects' AND policyname='Admins can delete admin prospects') THEN
    DROP POLICY "Admins can delete admin prospects" ON public.admin_prospects;
  END IF;
END $$;

-- Create clean, non-recursive policies
CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can view admin prospects"
ON public.admin_prospects
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert admin prospects"
ON public.admin_prospects
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update admin prospects"
ON public.admin_prospects
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete admin prospects"
ON public.admin_prospects
FOR DELETE
TO authenticated
USING (public.is_admin());
