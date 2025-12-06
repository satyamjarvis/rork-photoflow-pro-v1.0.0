-- Check user role and profile details
SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.status,
    p.onboarding_completed,
    p.last_login,
    p.created_at
FROM public.profiles p
WHERE p.email = 'dave0912@gmail.com';

-- Check if there are any admin users
SELECT 
    COUNT(*) as admin_count
FROM public.profiles
WHERE role = 'admin';

-- Check all users
SELECT 
    id,
    email,
    name,
    role,
    status
FROM public.profiles
ORDER BY created_at DESC;
