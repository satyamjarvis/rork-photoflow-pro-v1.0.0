-- ============================================
-- PhotoFlow Database - Clean Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Drop existing policies (if any)
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "Users can read own profile" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read all profiles" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update any profile" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own account" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can read visible locations" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read all locations" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can create locations" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update locations" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete locations" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can read non-hidden comments" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read all comments" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create comments" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own comments" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update any comment" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own comments" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete any comment" ON ' || r.tablename;
  END LOOP;
END $$;

-- Step 3: Create Tables
CREATE TABLE IF NOT EXISTS profiles (
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

CREATE TABLE IF NOT EXISTS locations (
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

CREATE TABLE IF NOT EXISTS location_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  hidden BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS workshops (
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

CREATE TABLE IF NOT EXISTS workshop_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workshop_id, user_id)
);

CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  visible BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS bts_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  subscriber_only BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  visible BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INT CHECK (discount_percent > 0 AND discount_percent <= 100),
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, push_token)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  row_id UUID,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS licensing_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed'))
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 4: Create Indexes
CREATE INDEX IF NOT EXISTS idx_locations_visible ON locations(visible);
CREATE INDEX IF NOT EXISTS idx_location_comments_location_id ON location_comments(location_id);
CREATE INDEX IF NOT EXISTS idx_location_comments_user_id ON location_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_workshops_date ON workshops(date);
CREATE INDEX IF NOT EXISTS idx_workshops_visible ON workshops(visible);
CREATE INDEX IF NOT EXISTS idx_portfolio_order_index ON portfolio(order_index);
CREATE INDEX IF NOT EXISTS idx_portfolio_visible ON portfolio(visible);
CREATE INDEX IF NOT EXISTS idx_bts_videos_visible ON bts_videos(visible);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Step 5: Create Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  INSERT INTO public.profiles (id, email, role, status, onboarding_completed, last_login)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'viewer' END,
    'active',
    CASE WHEN user_count = 0 THEN false ELSE true END,
    now()
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_admin_action(
  p_table_name TEXT,
  p_action TEXT,
  p_row_id UUID,
  p_payload JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (table_name, action, performed_by, row_id, payload)
  VALUES (p_table_name, p_action, auth.uid(), p_row_id, p_payload);
END;
$$;

CREATE OR REPLACE FUNCTION update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET last_login = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Step 6: Create Triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.sessions;
CREATE TRIGGER on_auth_user_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION update_last_login();

-- Step 7: Enable RLS
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

-- Step 8: Create Policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can delete own account" ON profiles;
CREATE POLICY "Users can delete own account" ON profiles
  FOR DELETE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can read visible locations" ON locations;
CREATE POLICY "Anyone can read visible locations" ON locations
  FOR SELECT USING (visible = true);

DROP POLICY IF EXISTS "Admins can read all locations" ON locations;
CREATE POLICY "Admins can read all locations" ON locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can create locations" ON locations;
CREATE POLICY "Admins can create locations" ON locations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update locations" ON locations;
CREATE POLICY "Admins can update locations" ON locations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete locations" ON locations;
CREATE POLICY "Admins can delete locations" ON locations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Anyone can read non-hidden comments" ON location_comments;
CREATE POLICY "Anyone can read non-hidden comments" ON location_comments
  FOR SELECT USING (hidden = false);

DROP POLICY IF EXISTS "Admins can read all comments" ON location_comments;
CREATE POLICY "Admins can read all comments" ON location_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Authenticated users can create comments" ON location_comments;
CREATE POLICY "Authenticated users can create comments" ON location_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON location_comments;
CREATE POLICY "Users can update own comments" ON location_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any comment" ON location_comments;
CREATE POLICY "Admins can update any comment" ON location_comments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can delete own comments" ON location_comments;
CREATE POLICY "Users can delete own comments" ON location_comments
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any comment" ON location_comments;
CREATE POLICY "Admins can delete any comment" ON location_comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Anyone can read visible workshops" ON workshops;
CREATE POLICY "Anyone can read visible workshops" ON workshops
  FOR SELECT USING (visible = true);

DROP POLICY IF EXISTS "Admins can read all workshops" ON workshops;
CREATE POLICY "Admins can read all workshops" ON workshops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can create workshops" ON workshops;
CREATE POLICY "Admins can create workshops" ON workshops
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update workshops" ON workshops;
CREATE POLICY "Admins can update workshops" ON workshops
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete workshops" ON workshops;
CREATE POLICY "Admins can delete workshops" ON workshops
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can read own registrations" ON workshop_registrations;
CREATE POLICY "Users can read own registrations" ON workshop_registrations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all registrations" ON workshop_registrations;
CREATE POLICY "Admins can read all registrations" ON workshop_registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can create registrations" ON workshop_registrations;
CREATE POLICY "Users can create registrations" ON workshop_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own registrations" ON workshop_registrations;
CREATE POLICY "Users can delete own registrations" ON workshop_registrations
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read visible portfolio" ON portfolio;
CREATE POLICY "Anyone can read visible portfolio" ON portfolio
  FOR SELECT USING (visible = true);

DROP POLICY IF EXISTS "Admins can read all portfolio" ON portfolio;
CREATE POLICY "Admins can read all portfolio" ON portfolio
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can create portfolio" ON portfolio;
CREATE POLICY "Admins can create portfolio" ON portfolio
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update portfolio" ON portfolio;
CREATE POLICY "Admins can update portfolio" ON portfolio
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete portfolio" ON portfolio;
CREATE POLICY "Admins can delete portfolio" ON portfolio
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Subscribers can read subscriber videos" ON bts_videos;
CREATE POLICY "Subscribers can read subscriber videos" ON bts_videos
  FOR SELECT USING (
    visible = true AND (
      NOT subscriber_only OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_subscriber = true)
    )
  );

DROP POLICY IF EXISTS "Admins can read all videos" ON bts_videos;
CREATE POLICY "Admins can read all videos" ON bts_videos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can create videos" ON bts_videos;
CREATE POLICY "Admins can create videos" ON bts_videos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update videos" ON bts_videos;
CREATE POLICY "Admins can update videos" ON bts_videos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete videos" ON bts_videos;
CREATE POLICY "Admins can delete videos" ON bts_videos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can read active coupons" ON coupons;
CREATE POLICY "Users can read active coupons" ON coupons
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    active = true AND
    (expires_at IS NULL OR expires_at > now())
  );

DROP POLICY IF EXISTS "Admins can read all coupons" ON coupons;
CREATE POLICY "Admins can read all coupons" ON coupons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can create coupons" ON coupons;
CREATE POLICY "Admins can create coupons" ON coupons
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update coupons" ON coupons;
CREATE POLICY "Admins can update coupons" ON coupons
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete coupons" ON coupons;
CREATE POLICY "Admins can delete coupons" ON coupons
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can read own devices" ON notification_devices;
CREATE POLICY "Users can read own devices" ON notification_devices
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can create own devices" ON notification_devices;
CREATE POLICY "Users can create own devices" ON notification_devices
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own devices" ON notification_devices;
CREATE POLICY "Users can delete own devices" ON notification_devices
  FOR DELETE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Admins can read all devices" ON notification_devices;
CREATE POLICY "Admins can read all devices" ON notification_devices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own inquiries" ON licensing_inquiries;
CREATE POLICY "Users can read own inquiries" ON licensing_inquiries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all inquiries" ON licensing_inquiries;
CREATE POLICY "Admins can read all inquiries" ON licensing_inquiries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can create inquiries" ON licensing_inquiries;
CREATE POLICY "Users can create inquiries" ON licensing_inquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Admins can update inquiries" ON licensing_inquiries;
CREATE POLICY "Admins can update inquiries" ON licensing_inquiries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "System can insert tokens" ON password_reset_tokens;
CREATE POLICY "System can insert tokens" ON password_reset_tokens
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update tokens" ON password_reset_tokens;
CREATE POLICY "System can update tokens" ON password_reset_tokens
  FOR UPDATE USING (true);
