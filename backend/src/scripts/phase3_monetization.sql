-- Phase 3: Monetization & Point Economy

-- 1. Promotion Tiers
CREATE TABLE IF NOT EXISTS public.promotion_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'Basic', 'Premium', 'Pro'
    cost_rwf INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    benefits_json JSONB DEFAULT '{}'::jsonb, -- e.g., {"boost_multiplier": 2, "verification": true}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Tiers
INSERT INTO public.promotion_tiers (name, cost_rwf, duration_days, benefits_json)
VALUES 
('Basic', 5000, 30, '{"boost_multiplier": 1.2, "badge": "supporter"}'),
('Premium', 15000, 30, '{"boost_multiplier": 2.0, "badge": "premium", "verification": true}'),
('Pro', 50000, 30, '{"boost_multiplier": 5.0, "badge": "pro", "verification": true, "vip_support": true}')
ON CONFLICT (name) DO NOTHING;


-- 2. Withdrawals
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    amount_rwf INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    payment_details JSONB, -- Mobile money number etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 3. Daily Earnings Tracker (Anti-Abuse)
CREATE TABLE IF NOT EXISTS public.daily_earnings_tracker (
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_points INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
);


-- 4. Secure Point Awarding Function with Limits
CREATE OR REPLACE FUNCTION public.award_points(
    target_user_id UUID,
    amount INTEGER,
    reason TEXT,
    source_type TEXT DEFAULT NULL,
    source_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    daily_cap INTEGER := 500; -- Max points per day from interactions
    current_daily_total INTEGER;
BEGIN
    -- 1. Check Daily Cap for Interaction-based Earnings
    IF reason IN ('like_received', 'comment_received', 'post_created', 'share') THEN
        INSERT INTO public.daily_earnings_tracker (user_id, date, total_points)
        VALUES (target_user_id, CURRENT_DATE, 0)
        ON CONFLICT (user_id, date) DO NOTHING;

        SELECT total_points INTO current_daily_total
        FROM public.daily_earnings_tracker
        WHERE user_id = target_user_id AND date = CURRENT_DATE;

        IF (current_daily_total + amount) > daily_cap THEN
            -- Cap exceeded, do not award (or maybe award partial?)
            -- For now, strict cutoff
            RETURN;
        END IF;

        -- Update Tracker
        UPDATE public.daily_earnings_tracker
        SET total_points = total_points + amount
        WHERE user_id = target_user_id AND date = CURRENT_DATE;
    END IF;

    -- 2. Record Transaction
    INSERT INTO public.points_ledger (user_id, amount, reason, source_id)
    VALUES (target_user_id, amount, reason, source_id);

    -- 3. Update Wallet Balance
    UPDATE public.wallets
    SET coins_balance = coins_balance + amount
    WHERE user_id = target_user_id;
    
    -- Create wallet if missing (safety net)
    IF NOT FOUND THEN
        INSERT INTO public.wallets (user_id, coins_balance)
        VALUES (target_user_id, amount);
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Updated Triggers to use `award_points`
-- Drop old specific triggers if they exist to replace with this centralized logic if desired
-- Or create new triggers for specifics.

-- Trigger: Award Points on Post Creation
CREATE OR REPLACE FUNCTION public.trigger_award_post_points()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.award_points(NEW.user_id, 10, 'post_created', 'post', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_created_award ON public.posts;
CREATE TRIGGER on_post_created_award
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trigger_award_post_points();

-- Trigger: Award Points on Like Received
CREATE OR REPLACE FUNCTION public.trigger_award_like_points()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    -- Get owner of the liked post
    SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
    
    -- Don't award for self-likes
    IF post_owner_id != NEW.user_id THEN
        PERFORM public.award_points(post_owner_id, 5, 'like_received', 'like', NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_created_award ON public.likes;
CREATE TRIGGER on_like_created_award
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.trigger_award_like_points();

