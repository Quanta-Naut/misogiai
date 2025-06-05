# 🔧 LaunchPad Troubleshooting Guide

## 🚨 Current Issues & Solutions

### Issue 1: "new row violates row-level security policy for table 'profiles'"

**SOLUTION: Run `emergency-rls-fix.sql`**

```sql
-- Copy and paste this entire script in Supabase SQL Editor
-- This will fix all RLS policy conflicts

-- Temporarily disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create very permissive policy for now
CREATE POLICY "Allow all profile operations" ON profiles FOR ALL USING (true) WITH CHECK (true);
```

### Issue 2: "Invalid credentials" after email confirmation

**ROOT CAUSE**: Supabase email confirmation settings or missing profile creation

**SOLUTIONS**:

#### Option A: Disable Email Confirmation (Recommended for testing)
1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll to **"Email Confirmation"**
3. **TURN OFF** "Enable email confirmations"
4. **TURN OFF** "Secure email change" (temporarily)
5. Click **Save**

#### Option B: Fix Email Confirmation Flow
Run `supabase-auth-fix.sql` in SQL Editor:

```sql
-- This ensures profiles are created even after email confirmation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, user_type)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    COALESCE(new.raw_user_meta_data->>'user_type', 'founder')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ language plpgsql security definer;
```

### Issue 3: Users exist but can't login

**SOLUTION**: Check and fix existing users

1. **Run this in Supabase SQL Editor**:
```sql
-- Check existing users
SELECT id, email, email_confirmed_at, created_at FROM auth.users;

-- Check existing profiles
SELECT * FROM profiles;

-- Create missing profiles for existing users
INSERT INTO profiles (user_id, full_name, user_type)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  'founder'
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM profiles);
```

## 🔄 Complete Reset Process (If needed)

If everything is broken, follow this step-by-step reset:

### Step 1: Reset Authentication Settings
1. **Supabase Dashboard** → **Authentication** → **Settings**
2. **Disable email confirmations** temporarily
3. **Set password requirements** to minimum
4. **Save settings**

### Step 2: Reset Database Policies
Run this in SQL Editor:
```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Clear existing data if needed (CAUTION!)
-- DELETE FROM profiles;
-- DELETE FROM auth.users;

-- Re-enable RLS with permissive policy
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON profiles FOR ALL USING (true) WITH CHECK (true);
```

### Step 3: Test User Creation
1. Try creating a new account with simple credentials
2. Check if profile is created automatically
3. Test login without email confirmation

## 🧪 Testing Checklist

### ✅ Quick Test Process
1. **Create new user** with simple email/password
2. **Check user in Auth** → Users table
3. **Check profile in Database** → profiles table
4. **Try login** immediately (no email confirmation)
5. **Access dashboard** to verify everything works

### ✅ Verification Queries
Run these in Supabase SQL Editor to check status:

```sql
-- Check auth users
SELECT email, email_confirmed_at, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Check profiles
SELECT user_id, full_name, user_type, created_at FROM profiles ORDER BY created_at DESC LIMIT 5;

-- Check if users have matching profiles
SELECT 
  u.email,
  u.created_at as user_created,
  p.full_name,
  p.user_type,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC
LIMIT 10;
```

## 🛠️ Manual Profile Creation

If automatic profile creation isn't working, create profiles manually:

```sql
-- Replace with actual user ID from auth.users table
INSERT INTO profiles (user_id, full_name, user_type)
VALUES (
  'your-user-id-here',
  'Test User',
  'founder'
);
```

## 🔐 Security Notes

**After everything works:**
1. **Re-enable email confirmation** in Supabase settings
2. **Implement proper RLS policies** (more restrictive)
3. **Test with fresh users** to ensure the flow works
4. **Monitor error logs** for any remaining issues

## 📞 Support

If issues persist:

1. **Check browser console** for JavaScript errors
2. **Check Supabase logs** in dashboard
3. **Verify environment variables** are correct
4. **Test with incognito/private browser** to rule out cache issues
5. **Try different email addresses** to test fresh signups

## 🚀 Quick Working Setup

**For immediate testing, use this minimal setup:**

1. **Disable email confirmation** in Supabase settings
2. **Run emergency-rls-fix.sql** to fix policies
3. **Create test account** with simple credentials
4. **Verify profile creation** in database
5. **Test login and dashboard access**

This should get your LaunchPad platform working immediately!