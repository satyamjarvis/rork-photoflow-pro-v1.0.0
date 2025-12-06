-- Fix infinite recursion in profiles RLS policies
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own account" ON profiles;
DROP POLICY IF EXISTS "Admins can delete any account" ON profiles;

-- Create a function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;

-- Create simplified, non-recursive policies

-- 1. INSERT: Allow profile creation during signup
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- 2. SELECT: Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 3. SELECT: Admins can read all profiles (using function)
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT
  USING (is_admin());

-- 4. UPDATE: Users can update their own profile (but not role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid() LIMIT 1)
  );

-- 5. UPDATE: Admins can update any profile
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (is_admin());

-- 6. DELETE: Users can delete their own profile
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE
  USING (auth.uid() = id);

-- 7. DELETE: Admins can delete any profile
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE
  USING (is_admin());

-- Verify the setup
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Test queries
SELECT 'Total profiles:' AS check_type, COUNT(*)::TEXT AS result FROM profiles
UNION ALL
SELECT 'Admin profiles:', COUNT(*)::TEXT FROM profiles WHERE role = 'admin'
UNION ALL
SELECT 'Active profiles:', COUNT(*)::TEXT FROM profiles WHERE status = 'active';
