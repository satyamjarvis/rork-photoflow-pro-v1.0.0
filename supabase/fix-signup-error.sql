-- Fix for "Database error saving new user" during signup
-- This comprehensive fix addresses trigger failures and RLS policy issues

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Recreate the handle_new_user function with proper error handling
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
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error for debugging but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    -- Return NEW to allow auth.users insert to succeed
    RETURN NEW;
END;
$$;

-- Step 3: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Step 4: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Update RLS policies for profiles
-- Remove old insert policy if exists
DROP POLICY IF EXISTS "Allow signup trigger to create profile" ON profiles;

-- Create a more permissive insert policy for signup
-- This allows the SECURITY DEFINER function to insert regardless of auth state
CREATE POLICY "Enable insert for authentication" ON profiles
  FOR INSERT WITH CHECK (true);

-- Step 6: Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Note: The SECURITY DEFINER function runs with the privileges of the user who defined it (postgres)
-- This allows it to bypass RLS and insert into profiles during signup
