-- StubGram Additional Tables for New Features
-- Run this in your Supabase SQL Editor
-- This version handles existing tables/policies gracefully

-- =====================================================
-- SAVED POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can view their own saved posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Users can save posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Users can unsave posts" ON public.saved_posts;

-- Policies for saved_posts
CREATE POLICY "Users can view their own saved posts"
    ON public.saved_posts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
    ON public.saved_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
    ON public.saved_posts FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- FOLLOWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;

-- Policies for follows
CREATE POLICY "Anyone can view follows"
    ON public.follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);

-- =====================================================
-- UPDATE FOLLOW COUNTS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_follow_counts(
    p_follower_id UUID,
    p_following_id UUID,
    p_increment BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    IF p_increment THEN
        -- Increment following count for follower
        UPDATE public.profiles
        SET following_count = COALESCE(following_count, 0) + 1
        WHERE id = p_follower_id;
        
        -- Increment followers count for followed user
        UPDATE public.profiles
        SET followers_count = COALESCE(followers_count, 0) + 1
        WHERE id = p_following_id;
    ELSE
        -- Decrement following count for follower
        UPDATE public.profiles
        SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0)
        WHERE id = p_follower_id;
        
        -- Decrement followers count for followed user
        UPDATE public.profiles
        SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0)
        WHERE id = p_following_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- WALLETS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can create their wallet" ON public.wallets;

CREATE POLICY "Users can view their own wallet"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their wallet"
    ON public.wallets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their wallet"
    ON public.wallets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRANSACTIONS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'deposit', 'withdraw')),
    amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- CREATE WALLET ON USER SIGNUP (Trigger)
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 100) -- Start with 100 free coins
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON public.profiles;
CREATE TRIGGER on_auth_user_created_wallet
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_wallet_for_new_user();

-- =====================================================
-- ADD COIN REWARD FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_coin_reward(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT
)
RETURNS INTEGER AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    -- Update wallet balance
    UPDATE public.wallets
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO new_balance;
    
    -- If no wallet exists, create one
    IF new_balance IS NULL THEN
        INSERT INTO public.wallets (user_id, balance)
        VALUES (p_user_id, p_amount)
        RETURNING balance INTO new_balance;
    END IF;
    
    -- Log transaction
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (p_user_id, CASE WHEN p_amount > 0 THEN 'earn' ELSE 'spend' END, ABS(p_amount), p_description);
    
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ADS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT,
    tier TEXT NOT NULL DEFAULT 'basic',
    budget_coins INTEGER NOT NULL DEFAULT 0,
    remaining_coins INTEGER NOT NULL DEFAULT 0,
    target_impressions INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own ads" ON public.ads;
DROP POLICY IF EXISTS "Users can create ads" ON public.ads;
DROP POLICY IF EXISTS "Users can update their own ads" ON public.ads;
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.ads;

-- Policies for ads
CREATE POLICY "Users can view their own ads"
    ON public.ads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active ads"
    ON public.ads FOR SELECT
    USING (status = 'active' AND remaining_coins > 0 AND expires_at > NOW());

CREATE POLICY "Users can create ads"
    ON public.ads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ads"
    ON public.ads FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- AD IMPRESSION TRACKING FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_ad_impression(ad_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.ads
    SET impressions = impressions + 1,
        remaining_coins = GREATEST(remaining_coins - 1, 0),
        status = CASE 
            WHEN remaining_coins <= 1 THEN 'completed'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = ad_id AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AD CLICK TRACKING FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_ad_click(ad_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.ads
    SET clicks = clicks + 1,
        updated_at = NOW()
    WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post ON public.saved_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_user ON public.ads(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON public.ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_active ON public.ads(status, remaining_coins, expires_at);

-- =====================================================
-- CREATE WALLET FOR EXISTING USERS (one-time migration)
-- =====================================================
INSERT INTO public.wallets (user_id, balance)
SELECT id, 100 FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.wallets)
ON CONFLICT (user_id) DO NOTHING;

