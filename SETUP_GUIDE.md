# PhotoFlow - Admin & Viewer Authentication System

## 📋 Overview

PhotoFlow is a mobile app with complete authentication, role-based access control, and admin mode toggling. The first user to sign up automatically becomes an admin.

## 🔐 Authentication Features

- **Login Screen** - Email/password + Face ID/Touch ID support
- **Create Account** - Name, Email, Password with strength validator and visual feedback
- **Forgot Password** - Email-based password reset with 15-minute expiry
- **Admin Mode Toggle** - Admins can switch between Admin and Viewer UI modes
- **Secure Password** - 10+ chars, uppercase, number, special character required
- **Password Matching** - Visual confirmation when passwords match

## 👤 Default Admin User

```
Name: David Hogan
Email: hello@davidhogan.ie
Phone: 0868059670
Password: Access12345
```

**IMPORTANT:** This password must be changed on first login.

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Environment Variables

Make sure you have these environment variables configured in Rork:

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
EXPO_PUBLIC_RESEND_FROM_EMAIL
RESEND_DOMAIN
EXPO_PUBLIC_EXPO_PUSH_KEY
```

### 3. Run Database Setup (Supabase)

#### Option A: Via Supabase Dashboard SQL Editor

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the schema SQL (see below)
5. Click **Run** or press `Cmd/Ctrl + Enter`

#### Option B: Via Supabase CLI

```bash
supabase db reset --local
psql $DATABASE_URL -f supabase/schema.sql
```

---

## 📦 Supabase Database Setup

### Complete Schema (Copy & Paste)

```sql
-- PhotoFlow Database Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_locations_visible ON locations(visible);
CREATE INDEX IF NOT EXISTS idx_location_comments_location_id ON location_comments(location_id);
CREATE INDEX IF NOT EXISTS idx_workshops_visible ON workshops(visible);
CREATE INDEX IF NOT EXISTS idx_portfolio_visible ON portfolio(visible);
CREATE INDEX IF NOT EXISTS idx_bts_videos_visible ON bts_videos(visible);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

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
-- IMPORTANT: First user becomes admin, all others are viewers
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

-- Trigger to auto-create profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE bts_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Locations Policies
CREATE POLICY "Anyone can read visible locations" ON locations
  FOR SELECT USING (visible = true);

CREATE POLICY "Admins can manage locations" ON locations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Comments Policies
CREATE POLICY "Anyone can read non-hidden comments" ON location_comments
  FOR SELECT USING (hidden = false);

CREATE POLICY "Users can create comments" ON location_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON location_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments" ON location_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Workshops Policies
CREATE POLICY "Anyone can read visible workshops" ON workshops
  FOR SELECT USING (visible = true);

CREATE POLICY "Admins can manage workshops" ON workshops
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Portfolio Policies
CREATE POLICY "Anyone can read visible portfolio" ON portfolio
  FOR SELECT USING (visible = true);

CREATE POLICY "Admins can manage portfolio" ON portfolio
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- BTS Videos Policies
CREATE POLICY "Subscribers can read videos" ON bts_videos
  FOR SELECT USING (
    visible = true AND (
      NOT subscriber_only OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_subscriber = true)
    )
  );

CREATE POLICY "Admins can manage videos" ON bts_videos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Audit Logs Policies
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 👨‍💼 Seed Admin User (Copy & Paste)

**Run this SQL ONLY if you want to manually create the admin user instead of having the first signup become admin:**

```sql
DO $$
DECLARE
  admin_user_id UUID;
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'hello@davidhogan.ie'
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE NOTICE 'Admin user already exists.';
  ELSE
    admin_user_id := uuid_generate_v4();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
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
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated'
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      uuid_generate_v4(),
      admin_user_id,
      format('{"sub":"%s","email":"hello@davidhogan.ie"}', admin_user_id)::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    UPDATE profiles
    SET
      name = 'David Hogan',
      phone = '0868059670',
      onboarding_completed = false
    WHERE id = admin_user_id;

    RAISE NOTICE 'Admin user created: hello@davidhogan.ie / Access12345';
  END IF;
END $$;
```

---

## 🏃 Running the App

### Development

```bash
# Start the development server
bun start

# Run on iOS simulator
bun ios

# Run on Android emulator
bun android
```

### First Time Setup Flow

1. **Open the app** - You'll see the Login screen
2. **Click "Create Account"**
3. **Enter details:**
   - Name: David Hogan
   - Email: hello@davidhogan.ie
   - Password: Access12345 (or a stronger one)
4. **First account becomes Admin automatically**
5. **Login and navigate to Profile tab**
6. **See the Admin Mode toggle** - Turn it ON/OFF to switch between Admin and Viewer UI

---

## 🎯 Admin Mode Toggle

### How It Works

- **Admin users** see an "Admin Mode" toggle in the Profile tab
- **When ON**: All admin features, buttons, and screens are visible
- **When OFF**: App looks like a regular viewer sees it (but your role stays admin)
- **Persistent**: State saved in AsyncStorage across app restarts
- **Confirmation modal**: Shows when toggling to explain the change
- **Visual indicators**: 
  - 👁️ "Viewing as Viewer" banner when OFF
  - ⚡ "Admin Mode Active" banner when ON
- **Audit logging**: Every toggle is logged to `audit_logs` table

### Security Notes

- ✅ UI toggle only - server-side security is always enforced via RLS
- ✅ Admin role never changes in database
- ✅ All admin API calls still require admin role server-side
- ✅ Toggle only affects what's shown in the UI

---

## 📱 App Features

### Authentication Screens

- ✅ **Login** - With Face ID / Touch ID support
- ✅ **Create Account** - Password strength validator with visual feedback
- ✅ **Forgot Password** - Email reset link

### Password Requirements

- ✅ Minimum 10 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 number
- ✅ At least 1 special character
- ✅ Visual strength meter (Weak / Medium / Strong)
- ✅ Password match confirmation

### Profile Tab

- ✅ User avatar and info
- ✅ Role badge (Admin / Viewer)
- ✅ Admin Mode toggle (admins only)
- ✅ User Management link (when admin mode ON)
- ✅ Settings menu items
- ✅ Sign Out button

---

## 🔧 Troubleshooting

### "User not found" or login fails

- Make sure you ran the schema SQL first
- Verify environment variables are set correctly
- Check Supabase dashboard for the user in Authentication > Users

### Admin mode toggle not appearing

- Make sure your user's role is 'admin' in the profiles table
- Check the database: `SELECT * FROM profiles WHERE email = 'your@email.com';`

### Database connection errors

- Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Check Supabase project settings for correct values

### First user is not admin

- Make sure the `handle_new_user()` trigger is created
- Drop all existing users and re-run the schema
- Or manually update: `UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';`

---

## 📄 Files Changed

- ✅ `app/login.tsx` - Login screen with biometric auth
- ✅ `app/create-account.tsx` - Signup with password validator
- ✅ `app/forgot-password.tsx` - Password reset flow
- ✅ `app/_layout.tsx` - Navigation config for auth screens
- ✅ `app/(tabs)/_layout.tsx` - Auth guard for tabs
- ✅ `app/(tabs)/profile.tsx` - Admin mode toggle UI
- ✅ `contexts/AuthContext.tsx` - Admin mode logic (already existed)
- ✅ `supabase/schema.sql` - Complete database schema
- ✅ `supabase/seed-admin.sql` - Admin user seed script

---

## ✅ Verification Steps

1. **Run Schema SQL** in Supabase Dashboard
2. **Start the app**: `bun start`
3. **Create first account** - Should become admin automatically
4. **Login** with the account
5. **Go to Profile tab** - See Admin Mode toggle
6. **Toggle Admin Mode OFF** - Admin controls disappear, "Viewing as Viewer" banner shows
7. **Toggle Admin Mode ON** - Admin controls reappear, "Admin Mode Active" banner shows
8. **Create second account** - Should become viewer (no toggle visible)

---

## 📞 Support

For issues or questions, contact the admin at: **hello@davidhogan.ie**
