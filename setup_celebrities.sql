-- Add last_seen to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Insert Celebrities into auth.users and profiles
-- We use a trick to insert into auth.users by enabling the extension if needed
-- But since we can't easily insert into auth.users from SQL editor without admin privileges (depending on setup),
-- We will assume we can. If this fails, the user might need to create them manually, 
-- but we'll try to use the raw SQL.

-- NOTE: In Supabase, direct insertion into auth.users is restricted.
-- However, for the purpose of this "fix", we might rely on the user running this in the SQL Editor which has admin rights.
-- We'll create a function to helper.

CREATE OR REPLACE FUNCTION create_celebrity_user(
  p_id UUID,
  p_email TEXT,
  p_username TEXT,
  p_full_name TEXT,
  p_avatar TEXT,
  p_bio TEXT,
  p_price INTEGER
) RETURNS VOID AS $$
BEGIN
  -- 1. Insert into auth.users
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    p_id,
    p_email,
    '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0123456789', -- Dummy hash
    NOW(),
    jsonb_build_object(
        'username', p_username,
        'full_name', p_full_name,
        'avatar_url', p_avatar
    )
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Insert/Update public.profiles
  -- Note: The trigger might create the profile, so we use ON CONFLICT UPDATE
  INSERT INTO public.profiles (
    id, username, full_name, avatar_url, bio, is_verified, is_celebrity, last_seen
  )
  VALUES (
    p_id, p_username, p_full_name, p_avatar, p_bio, true, true, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    is_celebrity = true,
    is_verified = true,
    bio = EXCLUDED.bio,
    avatar_url = EXCLUDED.avatar_url,
    last_seen = NOW();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Celebrities
SELECT create_celebrity_user(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'meddy@StubGram.com', 'MeddieSsentongo', 'Meddy', 
  'https://via.placeholder.com/150?text=Meddy', 'Rwandan R&B/Afrobeat Artist 🎵', 500
);

SELECT create_celebrity_user(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'bruce@StubGram.com', 'BruceMelody', 'Bruce Melodie', 
  'https://via.placeholder.com/150?text=Bruce', 'Afrobeat & Pop Singer 🇷🇼', 450
);

SELECT create_celebrity_user(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'kingjames@StubGram.com', 'TheReal_King_James', 'King James', 
  'https://via.placeholder.com/150?text=KJ', 'Rapper | Producer | Artist', 400
);

SELECT create_celebrity_user(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'charlene@StubGram.com', 'CharleneRuto', 'Charlene Ruto', 
  'https://via.placeholder.com/150?text=CR', 'Lifestyle & Fashion Influencer ✨', 350
);

SELECT create_celebrity_user(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'missrwanda@StubGram.com', 'MisRwanda_Official', 'Miss Rwanda', 
  'https://via.placeholder.com/150?text=MR', 'Beauty Queen 👑 | Ambassador', 400
);

SELECT create_celebrity_user(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'claire@StubGram.com', 'ClaireMuvunyi', 'Claire Muvunyi', 
  'https://via.placeholder.com/150?text=CM', 'Actress | TV Host | Model', 300
);

-- Success
DO $$
BEGIN
  RAISE NOTICE 'Celebrities setup successfully';
END $$;

