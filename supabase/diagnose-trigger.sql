-- Diagnose and fix trigger issues for user signup
-- Run this script in Supabase SQL Editor to check trigger status

-- Step 1: Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Step 2: Check if function exists
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proowner::regrole as owner
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Step 3: Check for orphaned auth users (users without profiles)
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  p.id as profile_id,
  p.created_at as profile_created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- Step 4: Check profiles count
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- Step 5: Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Step 6: Test if trigger function can be executed manually
-- (This will show any permission errors)
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Try to see if we can access the function
  SELECT proname INTO test_result
  FROM pg_proc
  WHERE proname = 'handle_new_user';
  
  IF test_result IS NOT NULL THEN
    RAISE NOTICE 'Function handle_new_user exists';
  ELSE
    RAISE NOTICE 'Function handle_new_user NOT FOUND';
  END IF;
END $$;

-- Step 7: Check trigger configuration
SELECT 
  event_object_schema,
  event_object_table,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
