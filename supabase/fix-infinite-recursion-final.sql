-- FINAL FIX for "Database error granting user"
-- This resolves infinite recursion in RLS policies during authentication

-- ============================================
-- STEP 1: Drop ALL existing policies on profiles
-- ============================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
    RAISE NOTICE 'All existing policies dropped';
END $$;

-- ============================================
-- STEP 2: Create helper function (SECURITY DEFINER)
-- This function bypasses RLS to check admin role
-- ============================================

CREATE OR REPLACE FUNCTION public.check_is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = check_user_id 
    AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO postgres, anon, authenticated, service_role;

-- ============================================
-- STEP 3: Create simple, non-recursive policies
-- ============================================

-- INSERT: Allow signup to create profiles (no restrictions)
CREATE POLICY "profiles_insert_signup" ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- SELECT: Users can read their own profile (direct comparison, no subquery)
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- SELECT: Admins can read all profiles (using helper function)
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

-- UPDATE: Users can update their own profile (direct comparison)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admins can update any profile (using helper function)
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

-- DELETE: Users can delete their own profile
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE
  USING (id = auth.uid());

-- DELETE: Admins can delete any profile (using helper function)
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

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
  new_role TEXT;
BEGIN
  -- Count existing profiles (bypasses RLS because of SECURITY DEFINER)
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Determine role
  IF user_count = 0 THEN
    new_role := 'admin';
  ELSE
    new_role := 'viewer';
  END IF;
  
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
    new_role,
    'active',
    false,
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RAISE NOTICE 'Profile already exists for user: %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't block authentication
    RAISE WARNING 'handle_new_user error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Sync existing auth users
-- ============================================

DO $$
DECLARE
  admin_exists BOOLEAN;
  auth_user RECORD;
  new_role TEXT;
BEGIN
  -- Check if any admin exists
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') INTO admin_exists;
  
  -- Insert profiles for users without them
  FOR auth_user IN 
    SELECT au.id, au.email, au.phone, au.created_at, au.last_sign_in_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    -- First user without profile becomes admin if no admin exists
    IF NOT admin_exists THEN
      new_role := 'admin';
      admin_exists := true;
    ELSE
      new_role := 'viewer';
    END IF;
    
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
      auth_user.id,
      COALESCE(auth_user.email, auth_user.phone, 'user-' || auth_user.id::text),
      new_role,
      'active',
      true,
      COALESCE(auth_user.last_sign_in_at, auth_user.created_at),
      auth_user.created_at,
      now()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created profile for user: % with role: %', auth_user.email, new_role;
  END LOOP;
END $$;

-- ============================================
-- STEP 6: Grant necessary permissions
-- ============================================

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.audit_logs TO service_role;

-- ============================================
-- STEP 7: Verification
-- ============================================

DO $$
DECLARE
  auth_count INT;
  profile_count INT;
  admin_count INT;
  orphan_count INT;
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
  SELECT COUNT(*) INTO orphan_count 
    FROM auth.users au 
    LEFT JOIN public.profiles p ON au.id = p.id 
    WHERE p.id IS NULL;
  SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auth users: %', auth_count;
  RAISE NOTICE 'Profiles: %', profile_count;
  RAISE NOTICE 'Admins: %', admin_count;
  RAISE NOTICE 'Orphaned auth users: %', orphan_count;
  RAISE NOTICE 'Active policies: %', policy_count;
  RAISE NOTICE '========================================';
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % orphaned auth users!', orphan_count;
  END IF;
  
  IF admin_count = 0 THEN
    RAISE WARNING 'No admin users found! First signup will become admin.';
  END IF;
END $$;
