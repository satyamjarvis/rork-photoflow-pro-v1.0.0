-- Create Admin User: Dave Hogan
-- Email: dave0912@gmail.com
-- Password: Access12345

-- First, let's check if user exists in auth.users
DO $$
DECLARE
  admin_user_id UUID;
  auth_user_exists BOOLEAN;
  profile_exists BOOLEAN;
BEGIN
  -- Check if auth user exists
  SELECT id INTO admin_user_id
  FROM auth.users 
  WHERE email = 'dave0912@gmail.com';
  
  auth_user_exists := (admin_user_id IS NOT NULL);
  
  IF auth_user_exists THEN
    RAISE NOTICE 'Auth user found with ID: %', admin_user_id;
    
    -- Check if profile exists
    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = admin_user_id
    ) INTO profile_exists;
    
    IF profile_exists THEN
      RAISE NOTICE 'Profile already exists. Updating to admin role...';
      
      -- Update existing profile to admin
      UPDATE public.profiles
      SET 
        role = 'admin',
        status = 'active',
        name = 'David Hogan',
        onboarding_completed = true,
        updated_at = now()
      WHERE id = admin_user_id;
      
      RAISE NOTICE 'Profile updated to admin successfully!';
    ELSE
      RAISE NOTICE 'No profile found. Creating admin profile...';
      
      -- Create admin profile
      INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        status,
        onboarding_completed,
        last_login,
        created_at,
        updated_at
      ) VALUES (
        admin_user_id,
        'dave0912@gmail.com',
        'David Hogan',
        'admin',
        'active',
        true,
        now(),
        now(),
        now()
      );
      
      RAISE NOTICE 'Admin profile created successfully!';
    END IF;
  ELSE
    RAISE NOTICE 'No auth user found. Creating new auth user...';
    
    -- Generate new UUID
    admin_user_id := gen_random_uuid();
    
    -- Create auth user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'dave0912@gmail.com',
      crypt('Access12345', gen_salt('bf')),
      now(),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated'
    );
    
    -- Create identity
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_user_id,
      admin_user_id::text,
      jsonb_build_object(
        'sub', admin_user_id::text,
        'email', 'dave0912@gmail.com',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );
    
    -- Create admin profile
    INSERT INTO public.profiles (
      id,
      email,
      name,
      role,
      status,
      onboarding_completed,
      last_login,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id,
      'dave0912@gmail.com',
      'David Hogan',
      'admin',
      'active',
      true,
      now(),
      now(),
      now()
    );
    
    RAISE NOTICE 'Auth user and admin profile created successfully!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ADMIN USER READY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: dave0912@gmail.com';
  RAISE NOTICE 'Password: Access12345';
  RAISE NOTICE 'Role: admin';
  RAISE NOTICE '========================================';
END $$;

-- Show the admin user
SELECT 
  p.id,
  p.email,
  p.name,
  p.role,
  p.status,
  p.onboarding_completed,
  p.created_at
FROM public.profiles p
WHERE p.email = 'dave0912@gmail.com';
