-- =====================================================
-- Stubgram V2.0 UPGRADE MIGRATION
-- =====================================================

-- 1. MEDIA METADATA & ASPECT RATIO
-- =====================================================
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS aspect_ratio FLOAT DEFAULT 1.0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS original_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- 2. ACCOUNT CLASSIFICATION
-- =====================================================
-- Add account_type if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_type') THEN
        ALTER TABLE public.profiles ADD COLUMN account_type TEXT DEFAULT 'regular' CHECK (account_type IN ('regular', 'vip', 'industry'));
    END IF;
END $$;

-- 3. POINTS ECONOMY (SERVER-SIDE)
-- =====================================================

-- 3.1 Points Ledger Table
CREATE TABLE IF NOT EXISTS public.points_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    source_id TEXT, -- Can be post_id, comment_id, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

-- Users can view their own points history
DROP POLICY IF EXISTS "Users view own points" ON public.points_ledger;
CREATE POLICY "Users view own points" ON public.points_ledger FOR SELECT USING (auth.uid() = user_id);

-- Only system/triggers can insert (No public insert policy)

-- 3.2 Wallet Column in Profiles (Denormalized Balance)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- 3.3 Triggers for Points

-- Function to add points and update balance
CREATE OR REPLACE FUNCTION public.award_points(p_user_id UUID, p_amount INTEGER, p_reason TEXT, p_source_id TEXT)
RETURNS VOID AS $$
BEGIN
    -- Insert into ledger
    INSERT INTO public.points_ledger (user_id, amount, reason, source_id)
    VALUES (p_user_id, p_amount, p_reason, p_source_id);

    -- Update profile balance
    UPDATE public.profiles
    SET coins = coins + p_amount
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger: Create Post (+10 points)
CREATE OR REPLACE FUNCTION public.handle_new_post_points()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.award_points(NEW.user_id, 10, 'Create Post', NEW.id::text);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_created_points ON public.posts;
CREATE TRIGGER on_post_created_points
    AFTER INSERT ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_post_points();


-- Trigger: Create Comment (+5 points)
CREATE OR REPLACE FUNCTION public.handle_new_comment_points()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.award_points(NEW.user_id, 5, 'Commented', NEW.id::text);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_created_points ON public.comments;
CREATE TRIGGER on_comment_created_points
    AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_points();


-- Trigger: Like Post (+1 point - Adjusted from Prompt "Like +5" to avoid inflation, or follow prompt exactly?
-- Prompt says: "Like +5". Okay, we follow prompt.
CREATE OR REPLACE FUNCTION public.handle_new_like_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Only award if not self-like
    IF NEW.user_id != (SELECT user_id FROM public.posts WHERE id = NEW.post_id) THEN
        PERFORM public.award_points(NEW.user_id, 5, 'Liked a post', NEW.post_id::text);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_created_points ON public.likes;
CREATE TRIGGER on_like_created_points
    AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_like_points();


-- 4. MESSAGE REQUESTS (The 60% Rule)
-- =====================================================
-- We will use a conversation_status enum or column
-- Assuming a 'conversations' table exists or we need to check how messages are handled.
-- For now, let's look at the existing schema for messages if possible.
-- Since we didn't see a messages table scan, we assume standard pattern.
-- We'll add a 'status' column to an assumed 'conversations' table or create a 'message_requests' table.

-- Let's create a generic cleaner function for now that can be attached later once we verify message schema.

