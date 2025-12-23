-- =====================================================
-- FIX REGISTRATION ERROR
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Drop the existing trigger and function to ensure a clean slate
-- We use "IF EXISTS" to avoid errors if they are actively missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.profiles
  -- We extract username and other metadata passed from the client
  INSERT INTO public.profiles (
    id, 
    username, 
    full_name, 
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create initial wallet with 100 coins (if not already handled by another trigger)
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Improve error reporting
  -- If there is a duplicate username, Postgres will raise a unique constraint violation
  -- We'll log the specific error
  RAISE EXCEPTION 'Database error saving new user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Fixed registration trigger on auth.users';
END $$;
