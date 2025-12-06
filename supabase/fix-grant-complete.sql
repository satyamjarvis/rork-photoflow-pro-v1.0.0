-- COMPLETE FIX for "Database error granting user"
-- This script fixes infinite recursion and grant errors during authentication

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

CREATE POLICY "profiles_insert_signup" ON public.profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE
  USING (id = auth.uid());

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 4: Fix signup trigger - CRITICAL FIX
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
  BEGIN
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    IF user_count = 0 THEN
      new_role := 'admin';
    ELSE
      new_role := 'viewer';
    END IF;
    
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
      RAISE NOTICE 'Profile already exists for user: %', NEW.id;
      RETURN NEW;
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
      RETURN NEW;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Grant necessary permissions
-- ============================================

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.audit_logs TO service_role;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  'Policies Created' as status,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

SELECT 
  'Existing Profiles' as status,
  COUNT(*) as count
FROM public.profiles;

SELECT 
  'Admin Users' as status,
  COUNT(*) as count
FROM public.profiles
WHERE role = 'admin';
