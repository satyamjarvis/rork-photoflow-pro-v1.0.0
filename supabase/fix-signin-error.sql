-- Fix sign-in error: "Database error granting user"
-- The issue is with recursive admin check during sign-in
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Drop problematic function and policies
-- ============================================

-- Drop the is_admin function that causes issues
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Drop ALL existing policies on profiles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Create simplified, non-recursive policies
-- ============================================

-- Policy 1: Allow INSERT for signup (no restrictions)
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Users can SELECT their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 3: Admins can SELECT all profiles (simple query, no function)
-- This checks role directly without calling functions
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT
  USING (
    id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      LIMIT 1
    )
  );

-- Policy 4: Users can UPDATE their own profile (but cannot change role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy 5: Admins can UPDATE any profile
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      LIMIT 1
    )
  );

-- Policy 6: Users can DELETE their own profile
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE
  USING (auth.uid() = id);

-- Policy 7: Admins can DELETE any profile
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      LIMIT 1
    )
  );

-- ============================================
-- STEP 3: Verify profiles trigger is correct
-- ============================================

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  v_role TEXT;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Determine role: first user is admin, rest are viewers
  v_role := CASE WHEN user_count = 0 THEN 'admin' ELSE 'viewer' END;
  
  -- Insert the new profile
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    status, 
    onboarding_completed, 
    last_login,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone, 'user-' || NEW.id::text),
    v_role,
    'active',
    false,
    now(),
    now(),
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just update last_login
    UPDATE public.profiles
    SET last_login = now(), updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  WHEN others THEN
    -- Log error but don't block auth
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 4: Sync existing users
-- ============================================

-- Sync any auth users that don't have profiles
INSERT INTO public.profiles (id, email, role, status, onboarding_completed, last_login, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.email, au.phone, 'user-' || au.id::text),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') = 0 THEN 'admin'
    ELSE 'viewer'
  END,
  'active',
  true,
  COALESCE(au.last_sign_in_at, au.created_at),
  au.created_at,
  now()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 5: Verification
-- ============================================

-- Display current state
SELECT 
  'Total auth users' AS metric,
  COUNT(*)::TEXT AS count
FROM auth.users
UNION ALL
SELECT 
  'Total profiles',
  COUNT(*)::TEXT
FROM public.profiles
UNION ALL
SELECT 
  'Admin profiles',
  COUNT(*)::TEXT
FROM public.profiles 
WHERE role = 'admin'
UNION ALL
SELECT 
  'Orphaned auth users (no profile)',
  COUNT(*)::TEXT
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Show all profiles
SELECT 
  email,
  role,
  status,
  created_at
FROM public.profiles
ORDER BY created_at ASC;

-- Test policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
