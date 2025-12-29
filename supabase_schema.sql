-- =====================================================
-- StubGram SUPABASE SCHEMA (IDEMPOTENT VERSION)
-- Safe to run multiple times - drops and recreates
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_celebrity BOOLEAN DEFAULT FALSE,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 2. POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT DEFAULT 'text',
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  link_title TEXT,
  link_description TEXT,
  link_image TEXT,
  background_gradient TEXT[],
  poll_options JSONB,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_boosted BOOLEAN DEFAULT FALSE,
  boost_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can insert posts" ON public.posts;

CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert posts" ON public.posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- Index for feed queries
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);

-- =====================================================
-- 3. COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  parent_id UUID,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can create comments" ON public.comments;

CREATE POLICY "Comments are viewable by everyone" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create comments" ON public.comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. LIKES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  reaction_type TEXT DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.likes;
DROP POLICY IF EXISTS "Anyone can like" ON public.likes;

CREATE POLICY "Likes are viewable by everyone" ON public.likes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can like" ON public.likes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can unlike posts" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. FOLLOWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Users can follow" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
DROP POLICY IF EXISTS "Anyone can follow" ON public.follows;

CREATE POLICY "Follows are viewable by everyone" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Anyone can follow" ON public.follows
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- =====================================================
-- 6. STORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT DEFAULT 'image',
  media_url TEXT,
  content TEXT,
  background_color TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;
DROP POLICY IF EXISTS "Users can create stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete their stories" ON public.stories;
DROP POLICY IF EXISTS "Anyone can view stories" ON public.stories;
DROP POLICY IF EXISTS "Anyone can create stories" ON public.stories;

CREATE POLICY "Anyone can view stories" ON public.stories
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create stories" ON public.stories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their stories" ON public.stories
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. WALLETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "System can update wallets" ON public.wallets;
DROP POLICY IF EXISTS "Anyone can view wallets" ON public.wallets;
DROP POLICY IF EXISTS "Anyone can insert wallets" ON public.wallets;

CREATE POLICY "Anyone can view wallets" ON public.wallets
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert wallets" ON public.wallets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update wallets" ON public.wallets
  FOR UPDATE USING (true);

-- =====================================================
-- 8. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  reference_id TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can insert transactions" ON public.transactions;

CREATE POLICY "Anyone can view transactions" ON public.transactions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 9. COURSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  price_coins INTEGER DEFAULT 0,
  price_fiat DECIMAL(10,2),
  currency TEXT DEFAULT 'RWF',
  duration_hours INTEGER,
  students_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Teachers can manage their courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can insert courses" ON public.courses;

CREATE POLICY "Anyone can view courses" ON public.courses
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert courses" ON public.courses
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 10. CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  last_message_id UUID,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;

CREATE POLICY "Anyone can view conversations" ON public.conversations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 11. MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can view messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON public.messages;

CREATE POLICY "Anyone can view messages" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Anyone can send messages" ON public.messages
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 12. ENROLLMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can enroll" ON public.enrollments;
DROP POLICY IF EXISTS "Anyone can view enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Anyone can enroll" ON public.enrollments;

CREATE POLICY "Anyone can view enrollments" ON public.enrollments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can enroll" ON public.enrollments
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 13. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;

CREATE POLICY "Anyone can view notifications" ON public.notifications
  FOR SELECT USING (true);

-- =====================================================
-- 14. COURSE LESSONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view course lessons" ON public.course_lessons;
DROP POLICY IF EXISTS "Anyone can insert course lessons" ON public.course_lessons;
DROP POLICY IF EXISTS "Anyone can update course lessons" ON public.course_lessons;
DROP POLICY IF EXISTS "Anyone can delete course lessons" ON public.course_lessons;

CREATE POLICY "Anyone can view course lessons" ON public.course_lessons
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert course lessons" ON public.course_lessons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update course lessons" ON public.course_lessons
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete course lessons" ON public.course_lessons
  FOR DELETE USING (true);

-- Index for ordering lessons
CREATE INDEX IF NOT EXISTS course_lessons_course_id_idx ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS course_lessons_order_idx ON public.course_lessons(course_id, order_index);

-- =====================================================
-- 15. LESSON PROGRESS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Anyone can insert lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Anyone can update lesson progress" ON public.lesson_progress;

CREATE POLICY "Anyone can view lesson progress" ON public.lesson_progress
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert lesson progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update lesson progress" ON public.lesson_progress
  FOR UPDATE USING (true);

-- Index for progress queries
CREATE INDEX IF NOT EXISTS lesson_progress_enrollment_idx ON public.lesson_progress(enrollment_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to enroll user with coins
CREATE OR REPLACE FUNCTION enroll_with_coins(
  p_user_id UUID,
  p_course_id UUID,
  p_cost INTEGER
) RETURNS UUID AS $$
DECLARE
  v_wallet_balance INTEGER;
  v_enrollment_id UUID;
BEGIN
  -- Check if already enrolled
  IF EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = p_user_id AND course_id = p_course_id) THEN
    RAISE EXCEPTION 'User is already enrolled in this course';
  END IF;

  -- Get current wallet balance
  SELECT balance INTO v_wallet_balance FROM public.wallets WHERE user_id = p_user_id;
  
  IF v_wallet_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;
  
  IF v_wallet_balance < p_cost THEN
    RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', p_cost, v_wallet_balance;
  END IF;
  
  -- Deduct coins from wallet
  UPDATE public.wallets 
  SET balance = balance - p_cost, 
      total_spent = total_spent + p_cost,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Create enrollment
  INSERT INTO public.enrollments (user_id, course_id)
  VALUES (p_user_id, p_course_id)
  RETURNING id INTO v_enrollment_id;
  
  -- Record transaction
  INSERT INTO public.transactions (user_id, type, amount, description, reference_id)
  VALUES (p_user_id, 'course_purchase', -p_cost, 'Course enrollment', p_course_id::TEXT);
  
  -- Update course students count
  UPDATE public.courses 
  SET students_count = students_count + 1 
  WHERE id = p_course_id;
  
  RETURN v_enrollment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('courses', 'courses', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'StubGram schema created/updated successfully!';
  RAISE NOTICE 'Tables: profiles, posts, comments, likes, follows, stories, wallets, transactions, courses, conversations, messages, enrollments, notifications, reels';
END $$;

-- =====================================================
-- 16. STORY VIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view story views" ON public.story_views FOR SELECT USING (true);
CREATE POLICY "Users can insert their own story views" ON public.story_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 17. REELS TABLE
-- =====================================================
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
CREATE POLICY "Reels are viewable by everyone" ON public.reels FOR SELECT USING (true);
CREATE POLICY "Anyone can create reels" ON public.reels FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS reels_created_at_idx ON public.reels(created_at DESC);

-- =====================================================
-- 18. REEL LIKES TABLE
-- =====================================================
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

-- =====================================================
-- 19. REEL COMMENTS TABLE
-- =====================================================
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
```
