-- =====================================================
-- StubGram Hardened Features Schema (Phase 1)
-- Meetings, Communities, Ads, Coins, and Quality Improvements
-- =====================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. MEETINGS (Hardened Zoom-Style)
-- =====================================================

-- Re-purposing or creating meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    meeting_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'active')),
    type TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('1-on-1', 'group', 'public', 'private')),
    is_private BOOLEAN DEFAULT FALSE,
    is_password_protected BOOLEAN DEFAULT FALSE,
    meeting_password TEXT,
    max_participants INTEGER DEFAULT 100,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting Participants
CREATE TABLE IF NOT EXISTS public.meeting_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'co-host', 'participant')),
    is_muted BOOLEAN DEFAULT TRUE,
    has_video BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(meeting_id, user_id)
);

-- =====================================================
-- 3. COMMUNITIES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    avatar_url TEXT,
    cover_url TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    members_count INTEGER DEFAULT 1,
    posts_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

-- =====================================================
-- 4. SMART ADVERTISING SYSTEM
-- =====================================================

-- Drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS public.ads CASCADE;

CREATE TABLE public.ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    link_url TEXT,
    target_audience JSONB, -- For future targeting
    budget_rwf INTEGER NOT NULL,
    duration_type TEXT NOT NULL CHECK (duration_type IN ('hour', 'day', 'month', 'year')),
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'expired')),
    impressions_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. POINTS / COINS SYSTEM
-- =====================================================

-- We'll use the existing wallets table but add a coins balance if not present
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS coins_balance INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive for earn, negative for spend
    reason TEXT NOT NULL, -- 'post_bonus', 'meeting_participation', 'ad_boost', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. POST IMPROVEMENTS (Link Metadata & Watermarking)
-- =====================================================

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS link_metadata JSONB; 
-- Stores {title, description, preview_image, domain}

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS watermark_applied BOOLEAN DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL;

-- =====================================================
-- 7. RLS POLICIES (Hardened)
-- =====================================================

-- MEETINGS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meetings are viewable by participants or public" ON public.meetings;
CREATE POLICY "Meetings are viewable by participants or public" ON public.meetings
    FOR SELECT USING (NOT is_private OR auth.uid() = host_id OR EXISTS (
        SELECT 1 FROM public.meeting_participants WHERE meeting_id = meetings.id AND user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Anyone can create meeting" ON public.meetings;
CREATE POLICY "Anyone can create meeting" ON public.meetings FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Host can update meeting" ON public.meetings;
CREATE POLICY "Host can update meeting" ON public.meetings FOR UPDATE USING (auth.uid() = host_id);

-- COMMUNITIES
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public communities are viewable by everyone" ON public.communities;
CREATE POLICY "Public communities are viewable by everyone" ON public.communities FOR SELECT USING (NOT is_private OR EXISTS (
    SELECT 1 FROM public.community_members WHERE community_id = communities.id AND user_id = auth.uid()
));

DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;
CREATE POLICY "Authenticated users can create communities" ON public.communities FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- COMMUNITY MEMBERS
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members viewable by community" ON public.community_members;
CREATE POLICY "Members viewable by community" ON public.community_members FOR SELECT USING (true); 
-- Making members visible solves the recursion. For a social app, seeing members is usually fine.
-- Or if we strictly want private, we could check just (user_id = auth.uid()) and another policy for "if in same community"
-- But "if in same community" requires checking membership which causes recursion.
-- Let's stick to Open Membership Visibility for now to fix the blockage.

DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
CREATE POLICY "Users can join communities" ON public.community_members FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;
CREATE POLICY "Users can leave communities" ON public.community_members FOR DELETE USING (user_id = auth.uid());

-- ADS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ads viewable if active" ON public.ads;
CREATE POLICY "Ads viewable if active" ON public.ads FOR SELECT USING (status = 'active' OR advertiser_id = auth.uid());

DROP POLICY IF EXISTS "Advertisers can manage their ads" ON public.ads;
CREATE POLICY "Advertisers can manage their ads" ON public.ads FOR ALL USING (advertiser_id = auth.uid());

-- COIN TRANSACTIONS
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own coin transactions" ON public.coin_transactions;
CREATE POLICY "Users view their own coin transactions" ON public.coin_transactions FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- 8. TRIGGERS & FUNCTIONS
-- =====================================================

-- Auto-increment members count in community
CREATE OR REPLACE FUNCTION public.handle_community_membership() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.communities SET members_count = members_count + 1 WHERE id = NEW.community_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.communities SET members_count = members_count - 1 WHERE id = OLD.community_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_community_membership_change ON public.community_members;
CREATE TRIGGER on_community_membership_change
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.handle_community_membership();

-- Auto-increment posts count in community
CREATE OR REPLACE FUNCTION public.handle_community_post() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') AND NEW.community_id IS NOT NULL THEN
        UPDATE public.communities SET posts_count = posts_count + 1 WHERE id = NEW.community_id;
    ELSIF (TG_OP = 'DELETE') AND OLD.community_id IS NOT NULL THEN
        UPDATE public.communities SET posts_count = posts_count - 1 WHERE id = OLD.community_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_community_post_change ON public.posts;
CREATE TRIGGER on_community_post_change
AFTER INSERT OR DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.handle_community_post();

-- Auto-register host as participant
CREATE OR REPLACE FUNCTION public.handle_meeting_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.meeting_participants (meeting_id, user_id, role, is_muted, has_video)
    VALUES (NEW.id, NEW.host_id, 'host', FALSE, TRUE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_meeting_created ON public.meetings;
CREATE TRIGGER on_meeting_created
AFTER INSERT ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.handle_meeting_creation();

-- =====================================================
-- SUCCESS
-- =====================================================
DO $$ BEGIN
  RAISE NOTICE 'StubGram Hardened Schema applied successfully!';
END $$;
