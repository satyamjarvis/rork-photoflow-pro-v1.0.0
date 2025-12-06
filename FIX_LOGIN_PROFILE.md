# Fix Login and Profile Issues

## What Happened
The recent SQL changes removed the "Allow profile creation" policy, which broke:
1. Admin login (authentication couldn't read profile)
2. Profile page on public view (couldn't load profile data)

## Quick Fix

Run this SQL file in your Supabase SQL Editor:
```
supabase/fix-profile-policies.sql
```

This will:
- Re-add the "Allow profile creation" policy
- Fix the admin profile read policies
- Allow profile updates to work correctly

## What Changed
- Added `INSERT` policy for profile creation
- Simplified admin check queries from `EXISTS (SELECT 1...)` to `(SELECT role...)`
- Added explicit policy for admins to delete accounts

## After Running the Fix
1. Try logging in as admin
2. Check that the profile page loads correctly
3. Verify user management can read all users

## Updated Main Setup File
I've also updated `supabase/CLEAN-SETUP.sql` with the correct policies for future reference.
