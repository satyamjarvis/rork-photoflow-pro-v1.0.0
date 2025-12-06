-- ============================================
-- COMPLETE DATABASE CLEAN RESET
-- PhotoFlow - Start from Scratch
-- ============================================
-- Run this in Supabase SQL Editor
-- This will delete EVERYTHING and create a fresh database
-- with admin user: David Hogan (dave0912@gmail.com)
-- ============================================

-- ============================================
-- STEP 1: DROP EVERYTHING
-- ============================================

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.sessions CASCADE;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles CASCADE;
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations CASCADE;
DROP TRIGGER IF EXISTS update_media_items_updated_at ON media_items CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_last_login() CASCADE;
DROP FUNCTION IF EXISTS public.log_admin_action(TEXT, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin(UUID) CASCADE;

-- Drop all storage policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Drop all tables (CASCADE will drop all foreign keys)
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS licensing_inquiries CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notification_devices CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS bts_videos CASCADE;
DROP TABLE IF EXISTS portfolio CASCADE;
DROP TABLE IF EXISTS workshop_registrations CASCADE;
DROP TABLE IF EXISTS workshops CASCADE;
DROP TABLE IF EXISTS location_comments CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS media_items CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Delete all storage buckets
DELETE FROM storage.buckets WHERE id IN ('avatars', 'media-images', 'media-videos', 'portfolio-images');

-- Delete all auth users (this will cascade to profiles if they existed)
DELETE FROM auth.users;

-- ============================================
-- STEP 2: ENABLE EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- STEP 3: CREATE TABLES
-- ============================================

-- Profiles Table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')) DEFAULT 'viewer',
  profile_image_url TEXT,
  is_subscriber BOOLEAN DEFAULT false,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended')) DEFAULT 'active',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  onboarding_completed BOOLEAN DEFAULT false
);

-- Locations Table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  hero_image_url TEXT,
  camera_settings JSONB,
  story_text TEXT,
  map_lat DOUBLE PRECISION,
  map_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  visible BOOLEAN DEFAULT true
);

-- Location Comments Table
CREATE TABLE location_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  hidden BOOLEAN DEFAULT false
);

-- Workshops Table
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE,
  price NUMERIC(10, 2),
  image_url TEXT,
  registration_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  visible BOOLEAN DEFAULT true
);

-- Workshop Registrations Table
CREATE TABLE workshop_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workshop_id, user_id)
);

-- Portfolio Table
CREATE TABLE portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  visible BOOLEAN DEFAULT true
);

-- BTS Videos Table
CREATE TABLE bts_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  subscriber_only BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  visible BOOLEAN DEFAULT true
);

-- Coupons Table
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INT CHECK (discount_percent > 0 AND discount_percent <= 100),
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications Devices Table
CREATE TABLE notification_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, push_token)
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  row_id UUID,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Licensing Inquiries Table
CREATE TABLE licensing_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed'))
);

-- Password Reset Tokens Table
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Media Items Table
CREATE TABLE media_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_bucket TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  usage_locations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================

CREATE INDEX idx_locations_visible ON locations(visible);
CREATE INDEX idx_location_comments_location_id ON location_comments(location_id);
CREATE INDEX idx_location_comments_user_id ON location_comments(user_id);
CREATE INDEX idx_workshops_date ON workshops(date);
CREATE INDEX idx_workshops_visible ON workshops(visible);
CREATE INDEX idx_portfolio_order_index ON portfolio(order_index);
CREATE INDEX idx_portfolio_visible ON portfolio(visible);
CREATE INDEX idx_bts_videos_visible ON bts_videos(visible);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(active);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX idx_media_items_media_type ON media_items(media_type);
CREATE INDEX idx_media_items_uploaded_by ON media_items(uploaded_by);
CREATE INDEX idx_media_items_created_at ON media_items(created_at DESC);

-- ============================================
-- STEP 5: CREATE FUNCTIONS (NON-RECURSIVE)
-- ============================================

-- Helper function to check if user is admin (SECURITY DEFINER - bypasses RLS)
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing profiles (bypasses RLS because of SECURITY DEFINER)
  SELECT COUNT(*)::INTEGER INTO user_count FROM public.profiles;
  
  -- Insert new profile
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    role, 
    status, 
    onboarding_completed, 
    last_login
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone, 'user-' || NEW.id::text),
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'viewer' END,
    'active',
    false,
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Profile already exists for user: %', NEW.id;
    RETURN NEW;
  WHEN others THEN
    RAISE WARNING 'handle_new_user error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Function to update last login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'update_last_login error: %', SQLERRM;
    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_last_login() TO postgres, anon, authenticated, service_role;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_table_name TEXT,
  p_action TEXT,
  p_row_id UUID,
  p_payload JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (table_name, action, performed_by, row_id, payload)
  VALUES (p_table_name, p_action, auth.uid(), p_row_id, p_payload);
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'log_admin_action error: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB) TO postgres, anon, authenticated, service_role;

-- ============================================
-- STEP 6: CREATE TRIGGERS
-- ============================================

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on locations
CREATE TRIGGER update_locations_updated_at 
  BEFORE UPDATE ON locations
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on media_items
CREATE TRIGGER update_media_items_updated_at 
  BEFORE UPDATE ON media_items
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update last login
CREATE TRIGGER on_auth_user_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_last_login();

-- ============================================
-- STEP 7: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE bts_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE licensing_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 8: CREATE RLS POLICIES (NON-RECURSIVE)
-- ============================================

-- PROFILES POLICIES

CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE
  USING (id = auth.uid());

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

-- LOCATIONS POLICIES

CREATE POLICY "locations_select_visible" ON locations
  FOR SELECT
  USING (visible = true);

CREATE POLICY "locations_select_admin" ON locations
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "locations_insert_admin" ON locations
  FOR INSERT
  WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "locations_update_admin" ON locations
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "locations_delete_admin" ON locations
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

-- LOCATION COMMENTS POLICIES

CREATE POLICY "comments_select_visible" ON location_comments
  FOR SELECT
  USING (hidden = false);

CREATE POLICY "comments_select_admin" ON location_comments
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "comments_insert_auth" ON location_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_own" ON location_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "comments_update_admin" ON location_comments
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "comments_delete_own" ON location_comments
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_admin" ON location_comments
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

-- WORKSHOPS POLICIES

CREATE POLICY "workshops_select_visible" ON workshops
  FOR SELECT
  USING (visible = true);

CREATE POLICY "workshops_select_admin" ON workshops
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "workshops_insert_admin" ON workshops
  FOR INSERT
  WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "workshops_update_admin" ON workshops
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "workshops_delete_admin" ON workshops
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

-- WORKSHOP REGISTRATIONS POLICIES

CREATE POLICY "registrations_select_own" ON workshop_registrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "registrations_select_admin" ON workshop_registrations
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "registrations_insert_own" ON workshop_registrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "registrations_delete_own" ON workshop_registrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- PORTFOLIO POLICIES

CREATE POLICY "portfolio_select_visible" ON portfolio
  FOR SELECT
  USING (visible = true);

CREATE POLICY "portfolio_select_admin" ON portfolio
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_insert_admin" ON portfolio
  FOR INSERT
  WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_update_admin" ON portfolio
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_delete_admin" ON portfolio
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

-- BTS VIDEOS POLICIES

CREATE POLICY "videos_select_subscriber" ON bts_videos
  FOR SELECT
  USING (
    visible = true AND (
      NOT subscriber_only OR
      public.check_is_admin(auth.uid()) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_subscriber = true)
    )
  );

CREATE POLICY "videos_insert_admin" ON bts_videos
  FOR INSERT
  WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "videos_update_admin" ON bts_videos
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "videos_delete_admin" ON bts_videos
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

-- COUPONS POLICIES

CREATE POLICY "coupons_select_active" ON coupons
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    active = true AND
    (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "coupons_select_admin" ON coupons
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "coupons_insert_admin" ON coupons
  FOR INSERT
  WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "coupons_update_admin" ON coupons
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "coupons_delete_admin" ON coupons
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

-- NOTIFICATION DEVICES POLICIES

CREATE POLICY "devices_select_own" ON notification_devices
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "devices_select_admin" ON notification_devices
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "devices_insert_own" ON notification_devices
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "devices_delete_own" ON notification_devices
  FOR DELETE
  USING (auth.uid() = profile_id);

-- AUDIT LOGS POLICIES

CREATE POLICY "audit_select_admin" ON audit_logs
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "audit_insert_admin" ON audit_logs
  FOR INSERT
  WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "audit_insert_system" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- LICENSING INQUIRIES POLICIES

CREATE POLICY "inquiries_select_own" ON licensing_inquiries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "inquiries_select_admin" ON licensing_inquiries
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "inquiries_insert_auth" ON licensing_inquiries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "inquiries_update_admin" ON licensing_inquiries
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

-- PASSWORD RESET TOKENS POLICIES

CREATE POLICY "tokens_insert_system" ON password_reset_tokens
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "tokens_update_system" ON password_reset_tokens
  FOR UPDATE
  USING (true);

-- MEDIA ITEMS POLICIES

CREATE POLICY "media_select_all" ON media_items
  FOR SELECT
  USING (true);

CREATE POLICY "media_insert_admin" ON media_items
  FOR INSERT
  WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "media_update_admin" ON media_items
  FOR UPDATE
  USING (public.check_is_admin(auth.uid()));

CREATE POLICY "media_delete_admin" ON media_items
  FOR DELETE
  USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 9: CREATE STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('media-images', 'media-images', true),
  ('media-videos', 'media-videos', true),
  ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 10: CREATE STORAGE POLICIES
-- ============================================

-- AVATARS BUCKET

CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- MEDIA-IMAGES BUCKET

CREATE POLICY "media_images_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media-images');

CREATE POLICY "media_images_insert_admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-images' AND
  public.check_is_admin(auth.uid())
);

CREATE POLICY "media_images_update_admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media-images' AND
  public.check_is_admin(auth.uid())
);

CREATE POLICY "media_images_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-images' AND
  public.check_is_admin(auth.uid())
);

-- MEDIA-VIDEOS BUCKET

CREATE POLICY "media_videos_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media-videos');

CREATE POLICY "media_videos_insert_admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-videos' AND
  public.check_is_admin(auth.uid())
);

CREATE POLICY "media_videos_update_admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media-videos' AND
  public.check_is_admin(auth.uid())
);

CREATE POLICY "media_videos_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-videos' AND
  public.check_is_admin(auth.uid())
);

-- PORTFOLIO-IMAGES BUCKET

CREATE POLICY "portfolio_images_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'portfolio-images');

CREATE POLICY "portfolio_images_insert_admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-images' AND
  public.check_is_admin(auth.uid())
);

CREATE POLICY "portfolio_images_update_admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'portfolio-images' AND
  public.check_is_admin(auth.uid())
);

CREATE POLICY "portfolio_images_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'portfolio-images' AND
  public.check_is_admin(auth.uid())
);

-- ============================================
-- STEP 11: GRANT PERMISSIONS
-- ============================================

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.locations TO service_role;
GRANT ALL ON public.location_comments TO service_role;
GRANT ALL ON public.workshops TO service_role;
GRANT ALL ON public.workshop_registrations TO service_role;
GRANT ALL ON public.portfolio TO service_role;
GRANT ALL ON public.bts_videos TO service_role;
GRANT ALL ON public.coupons TO service_role;
GRANT ALL ON public.notification_devices TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.licensing_inquiries TO service_role;
GRANT ALL ON public.password_reset_tokens TO service_role;
GRANT ALL ON public.media_items TO service_role;

-- ============================================
-- STEP 12: CREATE ADMIN USER
-- ============================================
-- Admin: David Hogan
-- Email: dave0912@gmail.com
-- Password: Access12345

DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create auth user with encrypted password
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'dave0912@gmail.com',
    crypt('Access12345', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"David Hogan"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- The trigger will automatically create the profile with admin role
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ADMIN USER CREATED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Name: David Hogan';
  RAISE NOTICE 'Email: dave0912@gmail.com';
  RAISE NOTICE 'Password: Access12345';
  RAISE NOTICE 'User ID: %', new_user_id;
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================
-- STEP 13: VERIFICATION
-- ============================================

DO $$
DECLARE
  auth_count INTEGER;
  profile_count INTEGER;
  admin_count INTEGER;
  bucket_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO auth_count FROM auth.users;
  SELECT COUNT(*)::INTEGER INTO profile_count FROM public.profiles;
  SELECT COUNT(*)::INTEGER INTO admin_count FROM public.profiles WHERE role = 'admin';
  SELECT COUNT(*)::INTEGER INTO bucket_count FROM storage.buckets WHERE id IN ('avatars', 'media-images', 'media-videos', 'portfolio-images');
  SELECT COUNT(*)::INTEGER INTO policy_count FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE SETUP VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auth users: %', auth_count;
  RAISE NOTICE 'Profiles: %', profile_count;
  RAISE NOTICE 'Admins: %', admin_count;
  RAISE NOTICE 'Storage buckets: %', bucket_count;
  RAISE NOTICE 'Storage policies: %', policy_count;
  RAISE NOTICE '========================================';
  
  IF auth_count = 0 THEN
    RAISE WARNING 'No auth users found!';
  END IF;
  
  IF profile_count = 0 THEN
    RAISE WARNING 'No profiles found!';
  END IF;
  
  IF admin_count = 0 THEN
    RAISE WARNING 'No admin users found!';
  END IF;
END $$;

-- Show admin user
SELECT 
  p.email,
  p.name,
  p.role,
  p.status,
  p.onboarding_completed,
  p.created_at
FROM public.profiles p
WHERE p.role = 'admin';

-- Show storage buckets
SELECT 
  id,
  name,
  public
FROM storage.buckets
ORDER BY name;

RAISE NOTICE '========================================';
RAISE NOTICE 'SETUP COMPLETE!';
RAISE NOTICE 'You can now login with:';
RAISE NOTICE 'Email: dave0912@gmail.com';
RAISE NOTICE 'Password: Access12345';
RAISE NOTICE '========================================';
