-- Drop the problematic policy
DROP POLICY IF EXISTS "Admin can manage all prospects" ON admin_prospects;

-- Create a simpler policy using profiles table instead of auth.users
CREATE POLICY "Admin full access to prospects"
ON admin_prospects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    JOIN profiles p ON p.email = au.email
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users au
    JOIN profiles p ON p.email = au.email
    WHERE p.id = auth.uid()
  )
);