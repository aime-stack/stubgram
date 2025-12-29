-- =====================================================
-- ADD REELS FEATURE TO STUBGRAM
-- =====================================================

-- 1. REELS BUCKET
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- 2. REELS TABLE
CREATE TABLE IF NOT EXISTS public.reels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reels are viewable by everyone" ON public.reels;
CREATE POLICY "Reels are viewable by everyone" ON public.reels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create reels" ON public.reels;
CREATE POLICY "Anyone can create reels" ON public.reels FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS reels_created_at_idx ON public.reels(created_at DESC);

-- 3. REEL LIKES
CREATE TABLE IF NOT EXISTS public.reel_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reel_id)
);

ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reel likes" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can like reels" ON public.reel_likes FOR INSERT WITH CHECK (true);

-- 4. REEL COMMENTS
CREATE TABLE IF NOT EXISTS public.reel_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reel comments" ON public.reel_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can comment on reels" ON public.reel_comments FOR INSERT WITH CHECK (true);
