# Database Setup Instructions

## Step 1: Reset Database (if needed)

If you need to start fresh, first run this in Supabase SQL Editor:

```sql
-- Drop all policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.sessions;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS log_admin_action(TEXT, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS update_last_login();

-- Drop tables
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
DROP TABLE IF EXISTS profiles CASCADE;

-- Delete auth users (WARNING: This deletes all users!)
DELETE FROM auth.users;
```

## Step 2: Run Full Setup

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/FULL-SETUP.sql`
3. Paste it into the SQL Editor
4. Click "Run"
5. Wait for completion (should show "Success")

## Step 3: Create Admin User

1. In the same SQL Editor (or open a new query)
2. Copy the entire contents of `supabase/create-admin.sql`
3. Paste it into the SQL Editor
4. Click "Run"
5. You should see a success message with login credentials

## Step 4: Verify Setup

Run this query to verify everything is set up correctly:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if admin user exists
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.name,
  p.phone,
  p.role,
  p.status
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'hello@davidhogan.ie';
```

## Step 5: Test Login

Use these credentials to log in:
- **Email**: hello@davidhogan.ie
- **Password**: Access12345
- **Phone**: 0868059670

## Troubleshooting

### Error: "Database error querying schema"

This usually means:
1. The tables weren't created properly
2. RLS policies are blocking access
3. The admin user wasn't created

**Solution**: Run the reset script (Step 1), then Steps 2-3 again.

### Error: "Invalid login credentials"

**Solutions**:
- Make sure you ran `create-admin.sql`
- Verify the admin user exists (run verification query)
- Try resetting the password via Supabase Dashboard → Authentication → Users

### Error: "User already exists"

If you see this when creating the admin:
1. The user already exists but might not have a profile
2. Go to Supabase Dashboard → Authentication → Users
3. Find the user and delete it
4. Run `create-admin.sql` again

## What Gets Created

### Tables
- `profiles` - User profiles linked to auth.users
- `locations` - Photo locations
- `location_comments` - Comments on locations
- `workshops` - Workshop listings
- `workshop_registrations` - User workshop registrations
- `portfolio` - Portfolio images
- `bts_videos` - Behind-the-scenes videos
- `coupons` - Discount coupons
- `notification_devices` - Push notification tokens
- `audit_logs` - Admin action logs
- `licensing_inquiries` - Image licensing requests
- `password_reset_tokens` - Password reset tokens

### Functions
- `handle_new_user()` - Auto-creates profile when user signs up
- `update_updated_at_column()` - Auto-updates timestamps
- `update_last_login()` - Tracks last login time
- `log_admin_action()` - Logs admin actions

### Admin User
- **Email**: hello@davidhogan.ie
- **Password**: Access12345
- **Role**: admin
- **Status**: active
- **Phone**: 0868059670
- **Onboarding**: Not completed (will be prompted to change password)

## Next Steps

After successful setup:
1. Log in to the app
2. Change your password (will be prompted)
3. Complete onboarding
4. Start using the app!
