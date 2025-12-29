-- =====================================================
-- StubGram SUPABASE SCHEMA V2 (Consolidated & Fixed)
-- =====================================================

-- 1. PROFILES & STATS AUTOMATION
-- =====================================================

-- Ensure columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- Trigger Function for Followers/Following Count
CREATE OR REPLACE FUNCTION public.handle_follow_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
        UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
CREATE TRIGGER on_follow_change
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_follow_stats();

-- Trigger Function for Posts Count
CREATE OR REPLACE FUNCTION public.handle_post_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.profiles SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_change ON public.posts;
CREATE TRIGGER on_post_change
    AFTER INSERT OR DELETE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.handle_post_stats();


-- 2. UNIFIED POSTS & REELS
-- =====================================================

-- Ensure posts table has all required columns
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Type check for posts
-- DO NOT CHANGE existing 'type' column but ensure it handles 'post' and 'reel'
-- We can add a constraint if needed, but keeping it flexible for now.

-- Migrate existing reels if the table exists (Optional/Manual step)
-- INSERT INTO public.posts (id, user_id, type, content, video_url, thumbnail_url, likes_count, comments_count, views_count, created_at)
-- SELECT id, user_id, 'reel', caption, video_url, thumbnail_url, likes_count, comments_count, views_count, created_at
-- FROM public.reels
-- ON CONFLICT (id) DO NOTHING;


-- 3. VIDEO SPACES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.video_spaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'invite')),
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('created', 'live', 'ended', 'archived')),
  is_audio_only BOOLEAN NOT NULL DEFAULT TRUE,
  invite_code TEXT UNIQUE,
  max_participants INTEGER DEFAULT 50,
  participant_count INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.video_space_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.video_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('host', 'moderator', 'speaker', 'viewer')),
  is_muted BOOLEAN DEFAULT TRUE,
  has_video BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(space_id, user_id)
);

-- RLS for Video Spaces
ALTER TABLE public.video_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_space_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public spaces viewable" ON public.video_spaces;
CREATE POLICY "Public spaces viewable" ON public.video_spaces FOR SELECT USING (true);

DROP POLICY IF EXISTS "Host manage space" ON public.video_spaces;
CREATE POLICY "Host manage space" ON public.video_spaces FOR ALL USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Anyone can join public" ON public.video_space_participants;
CREATE POLICY "Anyone can join public" ON public.video_space_participants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Participants viewable" ON public.video_space_participants;
CREATE POLICY "Participants viewable" ON public.video_space_participants FOR SELECT USING (true);


-- 4. STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'profiles', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('spaces', 'spaces', true) ON CONFLICT (id) DO NOTHING;

-- Policies for storage
-- NOTE: STORAGE policies are usually handled via the Supabase Dashboard, 
-- but we define basics for completeness if using SQL.
-- (Skipping for brevity as they are complex in SQL)
