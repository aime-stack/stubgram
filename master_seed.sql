-- =====================================================
-- MASTER DEMO SEED SCRIPT
-- =====================================================

-- 1. Create a "Demo Admin" if not exists
INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, is_verified)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin', 'Demo Administrator', 'https://via.placeholder.com/150?text=Admin', 'System Admin for SnapGram', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Populate Courses (Marketplace)
INSERT INTO public.courses (id, title, description, teacher_id, price_coins, thumbnail_url, students_count, rating, duration_hours)
VALUES 
  (uuid_generate_v4(), 'Mastering Afrobeat Vocals', 'Learn the secrets of hit-making in the African music scene.', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1200, 'https://images.unsplash.com/photo-1514525253361-bee8a48790c3?w=800', 450, 4.9, 5),
  (uuid_generate_v4(), 'Social Media Growth 2024', 'How to go viral and build a community from scratch.', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 850, 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800', 1200, 4.7, 4),
  (uuid_generate_v4(), 'Professional Stage Presence', 'Conquering stage fright and engaging your audience.', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 1500, 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800', 320, 5.0, 6),
  (uuid_generate_v4(), 'Music Production Basics', 'Start producing beats today using only your laptop.', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 2000, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800', 890, 4.8, 10)
ON CONFLICT DO NOTHING;

-- 3. Populate Recent Posts
INSERT INTO public.posts (id, user_id, content, image_url, type)
VALUES
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Back in the studio! New music coming soon 🎤🔥', 'https://images.unsplash.com/photo-1520529013033-bd540faaff47?w=1000', 'post'),
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'On set for something special... can you guess?', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1000', 'post'),
  (uuid_generate_v4(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Just had an amazing brunch at Kigali Heights! ☕️', 'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=1000', 'post')
ON CONFLICT DO NOTHING;

-- 4. Set Initial Wallet for Debugging
UPDATE public.wallets SET balance = balance + 10000 WHERE balance < 1000;

-- 5. Finalize setup
DO $$
BEGIN
  RAISE NOTICE 'Seed completed! Please refresh your app.';
END $$;
