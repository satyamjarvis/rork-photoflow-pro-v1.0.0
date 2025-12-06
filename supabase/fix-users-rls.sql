-- Fix RLS policies for profiles to allow admins to properly read all users

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Allow signup trigger to create profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own account" ON profiles;

-- Allow service role and authenticated users to insert profiles (for signup)
CREATE POLICY "Allow profile creation" ON profiles
  FOR INSERT WITH CHECK (true);

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create a policy that allows admins to read all profiles
-- This uses a simpler check that doesn't create circular dependencies
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can update their own profile (but not change their role)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Admins can update any profile (including role changes)
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can delete their own account
CREATE POLICY "Users can delete own account" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- Admins can delete any account
CREATE POLICY "Admins can delete any account" ON profiles
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
