-- Drop the conflicting admin policy that checks admin_users table
DROP POLICY IF EXISTS "Admins can create messages" ON public.support_messages;

-- Keep only the simple email-based policy for admin inserts
-- The policy "Admins can insert messages to any ticket" already exists and works