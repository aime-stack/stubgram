-- =====================================================
-- REELS & POSTS CONSOLIDATION: Final Schema Alignment
-- =====================================================

-- 1. Ensure 'posts' table has all necessary columns for all post types
DO $$
BEGIN
    -- Transcoding & Processing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'processing_status') THEN
        ALTER TABLE public.posts ADD COLUMN processing_status TEXT DEFAULT 'READY' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'READY', 'FAILED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'original_url') THEN
        ALTER TABLE public.posts ADD COLUMN original_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'processed_url') THEN
        ALTER TABLE public.posts ADD COLUMN processed_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'duration') THEN
        ALTER TABLE public.posts ADD COLUMN duration NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'resolution') THEN
        ALTER TABLE public.posts ADD COLUMN resolution TEXT;
    END IF;
    
    -- Missing Functional Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'video_url') THEN
        ALTER TABLE public.posts ADD COLUMN video_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE public.posts ADD COLUMN thumbnail_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'poll_options') THEN
        ALTER TABLE public.posts ADD COLUMN poll_options TEXT; -- We use JSON.stringify in frontend
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'link_url') THEN
        ALTER TABLE public.posts ADD COLUMN link_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media_metadata') THEN
        ALTER TABLE public.posts ADD COLUMN media_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

END $$;

-- 2. Repair Data: Map image_url to video_url for existing reels if missing
UPDATE public.posts SET video_url = image_url WHERE type = 'reel' AND video_url IS NULL;

-- 3. Update 'reels' table if it exists and is used as a view or legacy (optional, but keep it consistent)
-- Actually, our backend and frontend are now aligned to 'posts'.

-- 4. Constraint Updates for Likes/Comments
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Fix reel_likes
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.reel_likes'::regclass AND confrelid = 'public.reels'::regclass;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.reel_likes DROP CONSTRAINT ' || constraint_name;
        ALTER TABLE public.reel_likes ADD CONSTRAINT reel_likes_reel_id_fkey FOREIGN KEY (reel_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;

    -- Fix reel_comments
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.reel_comments'::regclass AND confrelid = 'public.reels'::regclass;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.reel_comments DROP CONSTRAINT ' || constraint_name;
        ALTER TABLE public.reel_comments ADD CONSTRAINT reel_comments_reel_id_fkey FOREIGN KEY (reel_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Force Schema Cache Refresh (Supabase/PostgREST)
NOTIFY pgrst, 'reload schema';
