-- Sync existing auth.users to profiles table
-- This script creates profiles for any auth users that don't have a profile yet

-- Insert profiles for users that exist in auth.users but not in profiles
INSERT INTO public.profiles (id, email, role, status, onboarding_completed, last_login)
SELECT 
  au.id,
  au.email,
  'viewer' AS role, -- All synced users will be viewers (manually update if admin needed)
  'active' AS status,
  true AS onboarding_completed,
  au.last_sign_in_at AS last_login
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL -- Only users without a profile
  AND au.email IS NOT NULL; -- Ensure email exists

-- Report how many users were synced
SELECT 
  COUNT(*) as synced_users
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NOT NULL;
