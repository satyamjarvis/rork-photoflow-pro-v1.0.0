CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  admin_user_id UUID;
  admin_exists BOOLEAN;
  identity_id UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'hello@davidhogan.ie'
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE NOTICE 'Admin user already exists. Skipping creation.';
  ELSE
    admin_user_id := uuid_generate_v4();
    identity_id := uuid_generate_v4();

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
      role,
      is_sso_user
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
      '{"name":"David Hogan"}'::jsonb,
      'authenticated',
      'authenticated',
      false
    );

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
      identity_id,
      admin_user_id,
      admin_user_id::text,
      format('{"sub":"%s","email":"hello@davidhogan.ie","email_verified":true,"phone_verified":false}', admin_user_id)::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    PERFORM pg_sleep(0.5);

    UPDATE profiles
    SET
      name = 'David Hogan',
      phone = '0868059670',
      onboarding_completed = false
    WHERE id = admin_user_id;

    RAISE NOTICE 'Admin user created successfully!';
    RAISE NOTICE 'Email: hello@davidhogan.ie';
    RAISE NOTICE 'Password: Access12345';
    RAISE NOTICE 'Phone: 0868059670';
    RAISE NOTICE 'Role: admin';
  END IF;
END $$;

SELECT 
  p.id,
  p.email,
  p.name,
  p.phone,
  p.role,
  p.status,
  p.onboarding_completed,
  p.created_at
FROM profiles p
WHERE p.email = 'hello@davidhogan.ie';
