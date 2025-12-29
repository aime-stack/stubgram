-- =====================================================
-- StubGram SEED DATA - Rwandan/African Content
-- Run this AFTER supabase_schema.sql
-- =====================================================

-- =====================================================
-- IMPORTANT: Temporarily disable foreign key checks
-- to allow inserting sample data
-- =====================================================

-- Drop the foreign key constraint temporarily
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add missing columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_celebrity BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- =====================================================
-- SAMPLE USERS/PROFILES
-- =====================================================

INSERT INTO public.profiles (id, username, full_name, bio, avatar_url, is_verified, followers_count, following_count, posts_count)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'mutesi_grace', 'Grace Mutesi', 'Kigali-based photographer 📸 | Capturing Rwanda''s beauty | DM for collabs', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200', true, 12540, 234, 89),
  ('00000000-0000-0000-0000-000000000002', 'kevin_neza', 'Kevin Neza', 'Tech Entrepreneur 🚀 | Building the future of African fintech | Kigali Innovation City', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', true, 45230, 156, 234),
  ('00000000-0000-0000-0000-000000000003', 'aline_uwimana', 'Aline Uwimana', 'Fashion Designer 👗 | African prints meet modern style | Shop: @alinedesigns', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', true, 28900, 890, 456),
  ('00000000-0000-0000-0000-000000000004', 'didier_mugisha', 'Didier Mugisha', 'Coffee farmer ☕ | Showcasing Rwanda''s finest beans | Huye District', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', false, 3420, 567, 78),
  ('00000000-0000-0000-0000-000000000005', 'chantal_iradukunda', 'Chantal Iradukunda', 'Travel blogger ✈️ | Exploring East Africa | 15 countries and counting!', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200', true, 67800, 234, 345)
ON CONFLICT (id) DO UPDATE SET 
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url;

-- =====================================================
-- SAMPLE POSTS
-- =====================================================

-- First, drop FK constraint on posts if it exists
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

-- Add missing columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

INSERT INTO public.posts (id, user_id, type, content, image_url, likes_count, comments_count, created_at)
VALUES
  -- Grace Mutesi's posts (Photographer)
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'image',
    'Sunrise over Lake Kivu this morning was absolutely magical! 🌅 There''s nothing quite like Rwanda''s natural beauty. #VisitRwanda #LakeKivu #Photography',
    'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800',
    1234,
    89,
    NOW() - INTERVAL '2 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'text',
    'Just wrapped up an amazing photoshoot at the Kigali Convention Centre! The architecture there is truly world-class. 📸 Who else loves capturing Kigali''s modern skyline?',
    NULL,
    567,
    34,
    NOW() - INTERVAL '1 day'
  ),
  
  -- Kevin Neza's posts (Tech Entrepreneur)
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'text',
    'Exciting news! 🎉 We just closed our Series A funding round! Thank you to everyone who believed in our vision of making digital payments accessible to every Rwandan. The journey is just beginning! #RwandaTech #Fintech #StartupLife',
    NULL,
    2345,
    156,
    NOW() - INTERVAL '3 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'link',
    'Great article on how Rwanda is becoming the Singapore of Africa. Our tech ecosystem is growing rapidly! 🇷🇼💪',
    NULL,
    890,
    67,
    NOW() - INTERVAL '2 days'
  ),
  
  -- Aline Uwimana's posts (Fashion Designer)
  (
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000003',
    'image',
    'New collection just dropped! 🔥 Inspired by the beautiful patterns of traditional Imigongo art. Each piece tells a story of our heritage. Shop link in bio! #AfricanFashion #MadeInRwanda #Imigongo',
    'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=800',
    3456,
    234,
    NOW() - INTERVAL '5 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000003',
    'image',
    'Behind the scenes at our studio! 🧵 Every stitch is made with love by our amazing team of local artisans. Supporting local = supporting communities 💚',
    'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800',
    1890,
    98,
    NOW() - INTERVAL '3 days'
  ),
  
  -- Didier Mugisha's posts (Coffee Farmer)
  (
    '10000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000004',
    'image',
    'Harvest season is here! ☕🌿 Our Bourbon variety beans are looking exceptional this year. Can''t wait to share this year''s batch with coffee lovers worldwide. #RwandanCoffee #SpecialtyCoffee #FarmToTable',
    'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800',
    678,
    45,
    NOW() - INTERVAL '6 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000004',
    'text',
    'Did you know? 🤔 Rwanda''s coffee is rated among the best in the world! Our high altitude and volcanic soil create the perfect conditions for growing exceptional beans. Proud to be part of this industry! ☕🇷🇼',
    NULL,
    456,
    23,
    NOW() - INTERVAL '4 days'
  ),
  
  -- Chantal Iradukunda's posts (Travel Blogger)
  (
    '10000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000005',
    'image',
    'Just had the most incredible gorilla trekking experience in Volcanoes National Park! 🦍💚 These gentle giants are truly magnificent. If you haven''t added this to your bucket list, do it NOW! #GorillaTracking #Rwanda #Wildlife',
    'https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=800',
    5678,
    345,
    NOW() - INTERVAL '8 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000005',
    'image',
    'Explored the beautiful Nyungwe Forest today! 🌳 The canopy walk was AMAZING - 50 meters above ground! My heart was racing but the views were worth it. Who''s brave enough to try it? 😄 #NyungweForest #AdventureTravel #EastAfrica',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800',
    4321,
    189,
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Skip comments, likes, follows that have FK constraints
-- We'll create these tables without FK for sample data
-- =====================================================

-- Create stories without FK constraint
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;

INSERT INTO public.stories (user_id, type, media_url, content, expires_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'image', 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=600', 'Morning vibes at Lake Kivu ☀️', NOW() + INTERVAL '20 hours'),
  ('00000000-0000-0000-0000-000000000002', 'text', NULL, '🎉 Big announcement coming soon! Stay tuned...', NOW() + INTERVAL '18 hours'),
  ('00000000-0000-0000-0000-000000000003', 'image', 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=600', 'New designs in progress! 🧵', NOW() + INTERVAL '22 hours'),
  ('00000000-0000-0000-0000-000000000005', 'image', 'https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=600', 'Today''s trekking adventure 🦍', NOW() + INTERVAL '16 hours')
ON CONFLICT DO NOTHING;

-- Create courses without FK constraint
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_teacher_id_fkey;

INSERT INTO public.courses (id, teacher_id, title, description, thumbnail_url, price_coins, duration_hours, students_count, rating)
VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Mobile Photography Masterclass',
    'Learn how to take stunning photos with just your smartphone! From composition to editing, master the art of mobile photography.',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
    500,
    8,
    234,
    4.8
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Building Your First Fintech Startup',
    'A comprehensive guide to launching a fintech company in Africa. From idea validation to funding, learn from a successful founder.',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400',
    1500,
    12,
    567,
    4.9
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'African Fashion Design Basics',
    'Discover the fundamentals of fashion design with African influences. Learn about patterns, fabrics, and creating your first collection.',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    800,
    10,
    189,
    4.7
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    'Coffee Farming: From Seed to Cup',
    'Everything you need to know about growing specialty coffee. Learn the secrets behind Rwanda''s world-renowned coffee.',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    600,
    6,
    89,
    4.6
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000005',
    'East Africa Travel Photography',
    'Capture the beauty of East Africa! Learn techniques for wildlife, landscape, and cultural photography while traveling.',
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400',
    700,
    8,
    345,
    4.9
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'StubGram seed data inserted successfully!';
  RAISE NOTICE 'Created: 5 users, 10 posts, 5 courses, 4 stories';
  RAISE NOTICE 'Sample users: mutesi_grace, kevin_neza, aline_uwimana, didier_mugisha, chantal_iradukunda';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Foreign key constraints were removed for sample data.';
  RAISE NOTICE 'For production, real users will be created via auth.users which triggers profile creation.';
END $$;

