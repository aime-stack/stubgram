-- =====================================================
-- MASTER DEBUG SEED: Reels & Video Spaces
-- =====================================================

-- 1. Ensure 'reels' storage bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create sample Reels in 'posts' table
-- We use a known user ID (admin) or a generic one if you have one.
-- Replacing with a subquery to find a valid user if 0000... doesn't exist.
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM public.profiles LIMIT 1;
    
    IF target_user_id IS NOT NULL THEN
        -- Insert a few sample reels
        INSERT INTO public.posts (user_id, type, content, video_url, thumbnail_url, views_count, likes_count)
        VALUES 
        (target_user_id, 'reel', 'Exploring the beautiful streets of Kigali! 🇷🇼 #Travel #Rwanda', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800', 1250, 45),
        (target_user_id, 'reel', 'Studio vibes today. New hit incoming! 🎶🎹 #StudioLife #Music', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800', 3420, 89),
        (target_user_id, 'reel', 'Quick workout motivation! 💪🔥 #Fitness #MorningRoutine', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800', 890, 12),
        (target_user_id, 'reel', 'Night life in downtown. 🌃✨ #NightLife #CityVibes', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1514525253361-bee8a48790c3?w=800', 5600, 230);
        
        RAISE NOTICE 'Sample reels inserted for user %', target_user_id;
    ELSE
        RAISE WARNING 'No user found in profiles table. Cannot seed reels.';
    END IF;
END $$;

-- 3. Fix potential mapping issues (image_url vs video_url)
UPDATE public.posts SET image_url = video_url WHERE type = 'reel' AND image_url IS NULL;

-- 4. Set up an active Video Space for testing
INSERT INTO public.video_spaces (host_id, title, description, type, status, is_audio_only)
SELECT id, 'Redesign Feedback Live', 'Discussing the new SnapGram look & feel!', 'public', 'live', true
FROM public.profiles
LIMIT 1;

-- 5. Final Notification
DO $$
BEGIN
  RAISE NOTICE 'Debug seed completed! Restart your app to see the new content.';
END $$;
