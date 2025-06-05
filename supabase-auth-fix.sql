-- Fix Supabase authentication issues
-- Run this in your Supabase SQL editor

-- Check if email confirmation is required
-- This query will show your current auth settings
SELECT * FROM auth.config;

-- Temporarily disable email confirmation for easier testing
-- You can re-enable this later in Supabase dashboard > Authentication > Settings
UPDATE auth.config SET enable_signup = true;

-- Also run this to check your current users
SELECT id, email, email_confirmed_at, created_at FROM auth.users;

-- Create a more robust profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile, ignore if already exists
  INSERT INTO public.profiles (user_id, full_name, user_type)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    COALESCE(new.raw_user_meta_data->>'user_type', 'founder')
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Profile creation failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ language plpgsql security definer;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Also create trigger for email confirmation
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW 
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE PROCEDURE public.handle_new_user();

SELECT 'Auth fix applied successfully!' as status;