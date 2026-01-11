-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can insert messages to any ticket" ON public.support_messages;

-- Recreate admin policies without recursion (using direct email check instead of subquery)
CREATE POLICY "Admins can view all tickets" 
ON public.support_tickets 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' IN ('oben.rockman@gmail.com')
);

CREATE POLICY "Admins can update all tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (
  auth.jwt() ->> 'email' IN ('oben.rockman@gmail.com')
);

CREATE POLICY "Admins can view all messages" 
ON public.support_messages 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' IN ('oben.rockman@gmail.com')
);

CREATE POLICY "Admins can insert messages to any ticket" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  auth.jwt() ->> 'email' IN ('oben.rockman@gmail.com')
);