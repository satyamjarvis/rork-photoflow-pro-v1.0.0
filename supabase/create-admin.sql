-- Create Admin User for PhotoFlow
-- Run this AFTER running FULL-SETUP.sql

DO $$
DECLARE
  admin_user_id UUID;
  admin_exists BOOLEAN;
BEGIN
  -- Check if admin already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'hello@davidhogan.ie'
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE NOTICE 'Admin user already exists. Skipping creation.';
  ELSE
    -- Generate a new UUID for the admin user
    admin_user_id := uuid_generate_v4();

    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'hello@davidhogan.ie',
      crypt('Access12345', gen_salt('bf')),
      now(),
      now(),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated'
    );

    -- Insert into auth.identities
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
      uuid_generate_v4(),
      admin_user_id,
      admin_user_id::text,
      jsonb_build_object(
        'sub', admin_user_id::text,
        'email', 'hello@davidhogan.ie',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );

    -- Wait for trigger to create profile
    PERFORM pg_sleep(0.5);

    -- Update profile with additional info
    UPDATE profiles
    SET
      name = 'David Hogan',
      phone = '0868059670',
      onboarding_completed = false
    WHERE id = admin_user_id;

    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'ADMIN USER CREATED SUCCESSFULLY!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Login Credentials:';
    RAISE NOTICE '  Email: hello@davidhogan.ie';
    RAISE NOTICE '  Password: Access12345';
    RAISE NOTICE '  Phone: 0868059670';
    RAISE NOTICE '  Role: admin';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now sign in to the app!';
    RAISE NOTICE '================================================';
  END IF;
END $$;

-- Verify the admin user was created
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.name,
  p.phone,
  p.role,
  p.status,
  p.onboarding_completed
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'hello@davidhogan.ie';
