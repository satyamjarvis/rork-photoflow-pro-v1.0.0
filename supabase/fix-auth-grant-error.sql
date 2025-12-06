-- Fix "Database error granting user" error
-- The problem: Recursive policy checks during authentication
-- Solution: Use security definer function with direct role checks

-- ============================================
-- STEP 1: Drop problematic policies
-- ============================================

DROP POLICY IF EXISTS "Enable insert for signup" ON profiles;
DROP POLICY IF EXISTS "Enable read own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read all for admins" ON profiles;
DROP POLICY IF EXISTS "Enable update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update all for admins" ON profiles;
DROP POLICY IF EXISTS "Enable delete own profile" ON profiles;
DROP POLICY IF EXISTS "Enable delete all for admins" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

-- Drop any other existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Create helper function for admin check
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id 
    AND role = 'admin'
  );
$$;

-- Grant execute to all roles
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO postgres, anon, authenticated, service_role;

-- ============================================
-- STEP 3: Create non-recursive policies
-- ============================================

-- INSERT: Allow signup trigger to create profiles
CREATE POLICY "profiles_allow_insert" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- SELECT: Users can read their own profile
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- SELECT: Admins can read all profiles (using helper function)
CREATE POLICY "profiles_select_as_admin" ON profiles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- UPDATE: Users can update their own profile
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- UPDATE: Admins can update any profile
CREATE POLICY "profiles_update_as_admin" ON profiles
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- DELETE: Users can delete their own profile
CREATE POLICY "profiles_delete_self" ON profiles
  FOR DELETE
  USING (id = auth.uid());

-- DELETE: Admins can delete any profile
CREATE POLICY "profiles_delete_as_admin" ON profiles
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- STEP 4: Fix signup trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  -- Count existing profiles (not recursively checking via RLS)
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Insert profile (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    status, 
    onboarding_completed, 
    last_login
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone, 'user-' || NEW.id::text),
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'viewer' END,
    'active',
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    last_login = now();
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Sync existing users
-- ============================================

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
-- STEP 6: Verify setup
-- ============================================

DO $$
DECLARE
  auth_count INT;
  profile_count INT;
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auth users: %', auth_count;
  RAISE NOTICE 'Profiles: %', profile_count;
  RAISE NOTICE 'Admins: %', admin_count;
  RAISE NOTICE '========================================';
END $$;

SELECT 
  email,
  role,
  status,
  created_at
FROM public.profiles
ORDER BY created_at;
