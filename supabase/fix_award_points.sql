-- =====================================================
-- FIX: resolve award_points function conflict
-- =====================================================

-- 1. Drop old triggers that might use the old function or be redundant
DROP TRIGGER IF EXISTS on_post_created_points ON public.posts;
DROP TRIGGER IF EXISTS on_post_created_award ON public.posts;

-- 2. Drop the old function overloads to clear the ambiguity
-- We use CASCADE to drop the trigger functions if they are the only things using them,
-- but we'll re-create the triggers correctly.
DROP FUNCTION IF EXISTS public.award_points(uuid, integer, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.award_points(uuid, integer, text, text, uuid) CASCADE;

-- 3. Re-create a unified award_points function
-- This version handles both profiles.coins and wallets.coins_balance for full compatibility.
CREATE OR REPLACE FUNCTION public.award_points(
    target_user_id UUID,
    amount INTEGER,
    reason TEXT,
    source_type TEXT DEFAULT NULL,
    source_id TEXT DEFAULT NULL -- Use TEXT for compatibility with existing points_ledger.source_id
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
            RETURN;
        END IF;

        UPDATE public.daily_earnings_tracker
        SET total_points = total_points + amount
        WHERE user_id = target_user_id AND date = CURRENT_DATE;
    END IF;

    -- 2. Record Transaction
    INSERT INTO public.points_ledger (user_id, amount, reason, source_id)
    VALUES (target_user_id, amount, reason, source_id);

    -- 3. Update Wallet Balance (v2 wallets table)
    UPDATE public.wallets
    SET coins_balance = coins_balance + amount
    WHERE user_id = target_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO public.wallets (user_id, coins_balance)
        VALUES (target_user_id, amount);
    END IF;

    -- 4. Update Profile Balance (v1 profile column)
    UPDATE public.profiles
    SET coins = COALESCE(coins, 0) + amount
    WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-create or Update the Post Creation Trigger
CREATE OR REPLACE FUNCTION public.trigger_award_post_points()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.award_points(NEW.user_id, 10, 'post_created', 'post', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_created_award
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trigger_award_post_points();

-- 5. Notify to reload schema
NOTIFY pgrst, 'reload schema';
