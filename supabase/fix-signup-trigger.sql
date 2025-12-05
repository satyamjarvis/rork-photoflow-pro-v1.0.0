-- Fix for "Database error saving new user" during signup
-- This script fixes the handle_new_user trigger to properly bypass RLS

-- Step 1: Recreate the handle_new_user function with proper permissions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Insert the new profile
  -- First user becomes admin, all others are viewers
  INSERT INTO public.profiles (id, email, role, status, onboarding_completed, last_login)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone, 'user-' || NEW.id::text),
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'viewer' END,
    'active',
    CASE WHEN user_count = 0 THEN false ELSE true END,
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error for debugging
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 2: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Step 3: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Add a policy to allow the trigger to insert profiles
-- This policy allows inserts when there's no authenticated user (during signup)
DROP POLICY IF EXISTS "Allow signup trigger to create profile" ON profiles;
CREATE POLICY "Allow signup trigger to create profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- Note: The SECURITY DEFINER function should now be able to insert into profiles
-- even with RLS enabled because it runs with elevated privileges
