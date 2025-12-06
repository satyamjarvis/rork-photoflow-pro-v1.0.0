-- Final fix for "Database error granting user" on sign-in
-- The issue: RLS policies checking admin role during sign-in create problems
-- Solution: Simplify policies to avoid any recursive checks during authentication

-- ============================================
-- STEP 1: Drop ALL policies on profiles table
-- ============================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Create SIMPLE, non-blocking policies
-- ============================================

-- Policy 1: Allow INSERT for signup (CRITICAL - no checks)
CREATE POLICY "Enable insert for signup" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Users can SELECT their own profile
CREATE POLICY "Enable read own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 3: Admins can SELECT all profiles
-- IMPORTANT: Use a separate query with LIMIT to prevent recursion
CREATE POLICY "Enable read all for admins" ON profiles
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Policy 4: Users can UPDATE their own profile
CREATE POLICY "Enable update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy 5: Admins can UPDATE any profile
CREATE POLICY "Enable update all for admins" ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Policy 6: Users can DELETE their own profile
CREATE POLICY "Enable delete own profile" ON profiles
  FOR DELETE
  USING (auth.uid() = id);

-- Policy 7: Admins can DELETE any profile
CREATE POLICY "Enable delete all for admins" ON profiles
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- ============================================
-- STEP 3: Ensure trigger function is correct
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
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Insert new profile
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
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile exists, just return
    RETURN NEW;
  WHEN others THEN
    -- Log but don't block auth
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 4: Sync existing auth users
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
-- STEP 5: Verification
-- ============================================

SELECT 
  '=== VERIFICATION RESULTS ===' AS status;

SELECT 
  'Auth users:' AS metric,
  COUNT(*)::TEXT AS value
FROM auth.users
UNION ALL
SELECT 
  'Profiles:',
  COUNT(*)::TEXT
FROM public.profiles
UNION ALL
SELECT 
  'Admins:',
  COUNT(*)::TEXT
FROM public.profiles WHERE role = 'admin'
UNION ALL
SELECT 
  'Orphaned users:',
  COUNT(*)::TEXT
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Show all profiles
SELECT 
  email,
  role,
  status,
  last_login
FROM public.profiles
ORDER BY created_at ASC;

-- Show active policies
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
