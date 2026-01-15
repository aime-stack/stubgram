-- Phase 6: Security Hardening & RLS

-- 1. Withdrawals Table
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can request withdrawals" ON public.withdrawals;
CREATE POLICY "Users can request withdrawals" ON public.withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Promotion Tiers (Public Read, System Write)
ALTER TABLE public.promotion_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public to view tiers" ON public.promotion_tiers;
CREATE POLICY "Public to view tiers" ON public.promotion_tiers
    FOR SELECT USING (true);

-- 3. Trending Topics (Public Read, System Write)
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public to view trends" ON public.trending_topics;
CREATE POLICY "Public to view trends" ON public.trending_topics
    FOR SELECT USING (true);

-- 4. Daily Earnings (Internal/System mostly, but User might want to check progress)
ALTER TABLE public.daily_earnings_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily tracker" ON public.daily_earnings_tracker;
CREATE POLICY "Users can view own daily tracker" ON public.daily_earnings_tracker
    FOR SELECT USING (auth.uid() = user_id);

-- 5. Conversations (Ensure Users can Create)
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can create conversation participants" ON public.conversation_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
-- Ensure 'conversations' table also has RLS if we strictly use it
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations they are in" ON public.conversations;
CREATE POLICY "Users can view conversations they are in" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = id
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (true);
