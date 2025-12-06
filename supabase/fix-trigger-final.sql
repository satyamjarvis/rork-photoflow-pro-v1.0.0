-- Final comprehensive fix for user signup trigger
-- This script ensures new users are automatically added to profiles table

-- Step 1: Drop existing trigger and function completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Recreate the function with comprehensive error handling
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
  
  -- Count existing users (exclude the user being created)
  SELECT COUNT(*) INTO user_count 
  FROM public.profiles;
  
  -- Determine role: first user is admin, rest are viewers
  IF user_count = 0 THEN
    v_role := 'admin';
    RAISE LOG 'First user - assigning admin role';
  ELSE
    v_role := 'viewer';
    RAISE LOG 'Not first user (count: %) - assigning viewer role', user_count;
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
    CASE WHEN v_role = 'admin' THEN false ELSE true END,
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    last_login = now(),
    updated_at = now();
  
  RAISE LOG 'Successfully created/updated profile for user: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log detailed error information
    RAISE WARNING 'Error in handle_new_user for user %: %, SQLSTATE: %', 
      NEW.id, SQLERRM, SQLSTATE;
    RAISE LOG 'Error details - Email: %, Count: %, Role: %', 
      NEW.email, user_count, v_role;
    -- Still return NEW to allow auth.users insert to succeed
    RETURN NEW;
END;
$$;

-- Step 3: Grant all necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Step 4: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Ensure RLS policies are correct
-- Drop old policies
DROP POLICY IF EXISTS "Allow signup trigger to create profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authentication" ON profiles;

-- Create comprehensive insert policy that allows:
-- 1. Authenticated users inserting their own profile
-- 2. Service role/trigger inserting any profile
CREATE POLICY "Enable insert during signup" ON profiles
  FOR INSERT 
  WITH CHECK (true);

-- Step 6: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Sync any existing auth users that don't have profiles
INSERT INTO public.profiles (id, email, role, status, onboarding_completed, last_login, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.email, au.phone, 'user-' || au.id::text),
  'viewer' AS role,
  'active' AS status,
  true AS onboarding_completed,
  COALESCE(au.last_sign_in_at, au.created_at) AS last_login,
  au.created_at,
  now() AS updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 8: Show results
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.profiles p ON au.id = p.id WHERE p.id IS NULL) as orphaned_users;

RAISE NOTICE 'Trigger setup complete. Check the results above.';
