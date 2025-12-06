-- Comprehensive fix for all authentication and profile issues
-- This script fixes:
-- 1. Profile table RLS policies to allow proper admin access
-- 2. User management reading from profiles table
-- 3. Profile page access for all users
-- 4. New user signup profile creation

-- ============================================
-- PART 1: Fix RLS policies for profiles table
-- ============================================

-- First, enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow signup trigger to create profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own account" ON profiles;
DROP POLICY IF EXISTS "Admins can delete any account" ON profiles;
DROP POLICY IF EXISTS "Enable insert during signup" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authentication" ON profiles;

-- Create simplified, working RLS policies
-- Policy 1: Allow profile creation during signup (INSERT)
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Users can read their own profile (SELECT)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 3: Admins can read ALL profiles (SELECT)
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy 4: Users can update their own profile (UPDATE)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Policy 5: Admins can update any profile (UPDATE)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy 6: Users can delete their own profile (DELETE)
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE
  USING (auth.uid() = id);

-- Policy 7: Admins can delete any profile (DELETE)
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- PART 2: Fix the trigger for new user creation
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the function
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
  -- Log that function is being called
  RAISE LOG 'handle_new_user triggered for user: %, email: %', NEW.id, NEW.email;
  
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Determine role: first user is admin, rest are viewers
  IF user_count = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := 'viewer';
  END IF;
  
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    last_login = now(),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PART 3: Sync existing auth users with profiles
-- ============================================

-- Insert profiles for any auth.users that don't have a profile yet
INSERT INTO public.profiles (id, email, role, status, onboarding_completed, last_login, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.email, au.phone, 'user-' || au.id::text),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') = 0 THEN 'admin'
    ELSE 'viewer'
  END AS role,
  'active' AS status,
  true AS onboarding_completed,
  COALESCE(au.last_sign_in_at, au.created_at) AS last_login,
  au.created_at,
  now() AS updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 4: Verification
-- ============================================

-- Show current state
DO $$
DECLARE
  auth_count INT;
  profile_count INT;
  orphaned_count INT;
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO orphaned_count 
  FROM auth.users au 
  LEFT JOIN public.profiles p ON au.id = p.id 
  WHERE p.id IS NULL;
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE 'Total auth.users: %', auth_count;
  RAISE NOTICE 'Total profiles: %', profile_count;
  RAISE NOTICE 'Orphaned users (auth without profile): %', orphaned_count;
  RAISE NOTICE 'Total admins: %', admin_count;
  RAISE NOTICE '==============================================';
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'There are still orphaned users! Check auth.users and profiles tables.';
  END IF;
  
  IF admin_count = 0 THEN
    RAISE WARNING 'No admin users found! The first user should be an admin.';
  END IF;
END $$;

-- Show all profiles
SELECT 
  id,
  email,
  name,
  role,
  status,
  created_at
FROM public.profiles
ORDER BY created_at ASC;
