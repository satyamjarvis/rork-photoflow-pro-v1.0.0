-- Fix audit logs RLS policy
-- The issue is that authenticated users need permission to insert audit logs

-- Drop existing policy
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Create new policy that allows authenticated admins to insert audit logs
CREATE POLICY "Admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Also keep a policy for service role / security definer functions
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
