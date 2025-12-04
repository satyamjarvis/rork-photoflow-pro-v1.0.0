# Database Setup - Complete Fix

This document provides the complete database setup to fix the "Database error querying schema" issue.

## Step 1: Reset Database (IMPORTANT - Run First)

Before running the schema, you need to **completely reset your database** to avoid conflicts with existing tables/policies.

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Paste and run:

```sql
-- ============================================
-- COMPLETE DATABASE RESET
-- ============================================
-- WARNING: This will delete ALL data
-- Only run this if you want a fresh start

-- Drop all policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own account" ON profiles;
DROP POLICY IF EXISTS "Anyone can read visible locations" ON locations;
DROP POLICY IF EXISTS "Admins can read all locations" ON locations;
DROP POLICY IF EXISTS "Admins can create locations" ON locations;
DROP POLICY IF EXISTS "Admins can update locations" ON locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON locations;
DROP POLICY IF EXISTS "Anyone can read non-hidden comments" ON location_comments;
DROP POLICY IF EXISTS "Admins can read all comments" ON location_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON location_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON location_comments;
DROP POLICY IF EXISTS "Admins can update any comment" ON location_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON location_comments;
DROP POLICY IF EXISTS "Admins can delete any comment" ON location_comments;
DROP POLICY IF EXISTS "Anyone can read visible workshops" ON workshops;
DROP POLICY IF EXISTS "Admins can read all workshops" ON workshops;
DROP POLICY IF EXISTS "Admins can create workshops" ON workshops;
DROP POLICY IF EXISTS "Admins can update workshops" ON workshops;
DROP POLICY IF EXISTS "Admins can delete workshops" ON workshops;
DROP POLICY IF EXISTS "Users can read own registrations" ON workshop_registrations;
DROP POLICY IF EXISTS "Admins can read all registrations" ON workshop_registrations;
DROP POLICY IF EXISTS "Users can create registrations" ON workshop_registrations;
DROP POLICY IF EXISTS "Users can delete own registrations" ON workshop_registrations;
DROP POLICY IF EXISTS "Anyone can read visible portfolio" ON portfolio;
DROP POLICY IF EXISTS "Admins can read all portfolio" ON portfolio;
DROP POLICY IF EXISTS "Admins can create portfolio" ON portfolio;
DROP POLICY IF EXISTS "Admins can update portfolio" ON portfolio;
DROP POLICY IF EXISTS "Admins can delete portfolio" ON portfolio;
DROP POLICY IF EXISTS "Subscribers can read subscriber videos" ON bts_videos;
DROP POLICY IF EXISTS "Admins can read all videos" ON bts_videos;
DROP POLICY IF EXISTS "Admins can create videos" ON bts_videos;
DROP POLICY IF EXISTS "Admins can update videos" ON bts_videos;
DROP POLICY IF EXISTS "Admins can delete videos" ON bts_videos;
DROP POLICY IF EXISTS "Users can read active coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can read all coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can create coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can update coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can delete coupons" ON coupons;
DROP POLICY IF EXISTS "Users can read own devices" ON notification_devices;
DROP POLICY IF EXISTS "Users can create own devices" ON notification_devices;
DROP POLICY IF EXISTS "Users can delete own devices" ON notification_devices;
DROP POLICY IF EXISTS "Admins can read all devices" ON notification_devices;
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can read own inquiries" ON licensing_inquiries;
DROP POLICY IF EXISTS "Admins can read all inquiries" ON licensing_inquiries;
DROP POLICY IF EXISTS "Users can create inquiries" ON licensing_inquiries;
DROP POLICY IF EXISTS "Admins can update inquiries" ON licensing_inquiries;
DROP POLICY IF EXISTS "System can insert tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "System can update tokens" ON password_reset_tokens;

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
```

## Step 2: Run the Main Schema

After resetting, run the complete schema from `supabase/schema.sql`:

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Click **Run**

## Step 3: Create Admin User

After the schema is set up, create the admin user:

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/seed-admin.sql`
4. Click **Run**

You should see:
```
Admin user created successfully!
Email: hello@davidhogan.ie
Password: Access12345
```

## Step 4: Verify Setup

Run this query to verify everything is working:

```sql
-- Check if admin user exists
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  p.name,
  p.role,
  p.status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'hello@davidhogan.ie';
```

You should see a result with:
- Email: hello@davidhogan.ie
- Name: David Hogan
- Role: admin
- Status: active

## Step 5: Test Login

Now try logging in through your app with:
- Email: `hello@davidhogan.ie`
- Password: `Access12345`

## Troubleshooting

### If you still get "Database error querying schema":

1. **Check RLS is enabled**: Run this to verify RLS is on:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```
   All tables should have `rowsecurity = true`

2. **Check policies exist**: Run this:
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```
   You should see multiple policies for each table.

3. **Check the profiles table has data**:
   ```sql
   SELECT COUNT(*) FROM profiles;
   ```
   Should be at least 1 (the admin user).

4. **Check auth.users has the admin**:
   ```sql
   SELECT email, email_confirmed_at, created_at 
   FROM auth.users 
   WHERE email = 'hello@davidhogan.ie';
   ```

### If admin creation fails:

Delete the user and try again:
```sql
DELETE FROM auth.users WHERE email = 'hello@davidhogan.ie';
```

Then re-run the seed-admin.sql script.

## Common Issues

### Issue: "syntax error at or near $"
**Solution**: Make sure you're copying the entire SQL block including the `DO $$` and `END $$;` parts.

### Issue: "provider_id violates not-null constraint"
**Solution**: This is fixed in the seed-admin.sql - it now includes `provider_id` in the identities insert.

### Issue: Can't sign in after user is created
**Solution**: 
1. Verify email_confirmed_at is set (not NULL)
2. Check that the trigger created a profile entry
3. Ensure RLS policies allow the user to read their own profile

## Need More Help?

If you're still having issues after following all these steps:

1. Share the exact error message
2. Run the verification queries above and share the results
3. Check your Supabase logs in Dashboard → Logs → Auth
