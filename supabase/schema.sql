-- PhotoFlow Database Schema
-- REQUIRES: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles Table (linked to auth.users)
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

-- Locations Table
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

-- Location Comments Table
CREATE TABLE IF NOT EXISTS location_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  hidden BOOLEAN DEFAULT false
);

-- Workshops Table
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

-- Workshop Registrations Table
CREATE TABLE IF NOT EXISTS workshop_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workshop_id, user_id)
);

-- Portfolio Table
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  visible BOOLEAN DEFAULT true
);

-- BTS Videos Table
CREATE TABLE IF NOT EXISTS bts_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  subscriber_only BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  visible BOOLEAN DEFAULT true
);

-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INT CHECK (discount_percent > 0 AND discount_percent <= 100),
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications Devices Table
CREATE TABLE IF NOT EXISTS notification_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, push_token)
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  row_id UUID,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Licensing Inquiries Table
CREATE TABLE IF NOT EXISTS licensing_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed'))
);

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

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

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
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
$;

-- Trigger to auto-create profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
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

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Allow signup trigger to create profile
CREATE POLICY "Allow signup trigger to create profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can delete their own account
CREATE POLICY "Users can delete own account" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- ============================================
-- LOCATIONS POLICIES
-- ============================================

-- Anyone can read visible locations
CREATE POLICY "Anyone can read visible locations" ON locations
  FOR SELECT USING (visible = true);

-- Admins can read all locations
CREATE POLICY "Admins can read all locations" ON locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can create locations
CREATE POLICY "Admins can create locations" ON locations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update locations
CREATE POLICY "Admins can update locations" ON locations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete locations
CREATE POLICY "Admins can delete locations" ON locations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- LOCATION COMMENTS POLICIES
-- ============================================

-- Anyone can read non-hidden comments
CREATE POLICY "Anyone can read non-hidden comments" ON location_comments
  FOR SELECT USING (hidden = false);

-- Admins can read all comments
CREATE POLICY "Admins can read all comments" ON location_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" ON location_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON location_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can update any comment
CREATE POLICY "Admins can update any comment" ON location_comments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON location_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can delete any comment
CREATE POLICY "Admins can delete any comment" ON location_comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- WORKSHOPS POLICIES
-- ============================================

-- Anyone can read visible workshops
CREATE POLICY "Anyone can read visible workshops" ON workshops
  FOR SELECT USING (visible = true);

-- Admins can read all workshops
CREATE POLICY "Admins can read all workshops" ON workshops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can create workshops
CREATE POLICY "Admins can create workshops" ON workshops
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update workshops
CREATE POLICY "Admins can update workshops" ON workshops
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete workshops
CREATE POLICY "Admins can delete workshops" ON workshops
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- WORKSHOP REGISTRATIONS POLICIES
-- ============================================

-- Users can read their own registrations
CREATE POLICY "Users can read own registrations" ON workshop_registrations
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all registrations
CREATE POLICY "Admins can read all registrations" ON workshop_registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can create registrations
CREATE POLICY "Users can create registrations" ON workshop_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own registrations
CREATE POLICY "Users can delete own registrations" ON workshop_registrations
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PORTFOLIO POLICIES
-- ============================================

-- Anyone can read visible portfolio items
CREATE POLICY "Anyone can read visible portfolio" ON portfolio
  FOR SELECT USING (visible = true);

-- Admins can read all portfolio items
CREATE POLICY "Admins can read all portfolio" ON portfolio
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can create portfolio items
CREATE POLICY "Admins can create portfolio" ON portfolio
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update portfolio items
CREATE POLICY "Admins can update portfolio" ON portfolio
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete portfolio items
CREATE POLICY "Admins can delete portfolio" ON portfolio
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- BTS VIDEOS POLICIES
-- ============================================

-- Subscribers can read visible subscriber-only videos
CREATE POLICY "Subscribers can read subscriber videos" ON bts_videos
  FOR SELECT USING (
    visible = true AND (
      NOT subscriber_only OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_subscriber = true)
    )
  );

-- Admins can read all videos
CREATE POLICY "Admins can read all videos" ON bts_videos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can create videos
CREATE POLICY "Admins can create videos" ON bts_videos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update videos
CREATE POLICY "Admins can update videos" ON bts_videos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete videos
CREATE POLICY "Admins can delete videos" ON bts_videos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- COUPONS POLICIES
-- ============================================

-- Authenticated users can read active, non-expired coupons
CREATE POLICY "Users can read active coupons" ON coupons
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    active = true AND
    (expires_at IS NULL OR expires_at > now())
  );

-- Admins can read all coupons
CREATE POLICY "Admins can read all coupons" ON coupons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can create coupons
CREATE POLICY "Admins can create coupons" ON coupons
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update coupons
CREATE POLICY "Admins can update coupons" ON coupons
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete coupons
CREATE POLICY "Admins can delete coupons" ON coupons
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- NOTIFICATION DEVICES POLICIES
-- ============================================

-- Users can read their own devices
CREATE POLICY "Users can read own devices" ON notification_devices
  FOR SELECT USING (auth.uid() = profile_id);

-- Users can create their own devices
CREATE POLICY "Users can create own devices" ON notification_devices
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users can delete their own devices
CREATE POLICY "Users can delete own devices" ON notification_devices
  FOR DELETE USING (auth.uid() = profile_id);

-- Admins can read all devices (for sending notifications)
CREATE POLICY "Admins can read all devices" ON notification_devices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Admins can read all audit logs
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role can insert audit logs (via security definer functions)
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- LICENSING INQUIRIES POLICIES
-- ============================================

-- Users can read their own inquiries
CREATE POLICY "Users can read own inquiries" ON licensing_inquiries
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all inquiries
CREATE POLICY "Admins can read all inquiries" ON licensing_inquiries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can create inquiries
CREATE POLICY "Users can create inquiries" ON licensing_inquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Admins can update inquiries (change status)
CREATE POLICY "Admins can update inquiries" ON licensing_inquiries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- PASSWORD RESET TOKENS POLICIES
-- ============================================

-- No direct read access (tokens handled via functions)
-- System can insert tokens (via service role or function)
CREATE POLICY "System can insert tokens" ON password_reset_tokens
  FOR INSERT WITH CHECK (true);

-- System can update tokens (via service role or function)
CREATE POLICY "System can update tokens" ON password_reset_tokens
  FOR UPDATE USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to log admin actions
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

-- Function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET last_login = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger to update last login on auth
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.sessions;
CREATE TRIGGER on_auth_user_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION update_last_login();

-- ============================================
-- SEED DATA (First Admin User)
-- ============================================
-- NOTE: The first user to sign up will automatically become admin via the trigger
-- To manually seed an admin user, run the following after setup:
-- 
-- INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   'hello@davidhogan.ie',
--   crypt('Access12345', gen_salt('bf')),
--   now(),
--   now(),
--   now()
-- );
-- 
-- The trigger will automatically create the profile with admin role.
