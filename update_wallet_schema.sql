-- =====================================================
-- WALLET SCHEMA UPDATES
-- =====================================================

-- Ensure wallets table has currency and status if not already present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'currency') THEN
        ALTER TABLE public.wallets ADD COLUMN currency TEXT DEFAULT 'RWF';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'status') THEN
        ALTER TABLE public.wallets ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Update transactions table for Paypack integration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'fees') THEN
        ALTER TABLE public.transactions ADD COLUMN fees INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'paypack_id') THEN
        ALTER TABLE public.transactions ADD COLUMN paypack_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'reference') THEN
        ALTER TABLE public.transactions ADD COLUMN reference TEXT;
    END IF;
END $$;

-- Update status column default to PENDING for new transactions
ALTER TABLE public.transactions ALTER COLUMN status SET DEFAULT 'PENDING';

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Users can only view their own wallet
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
CREATE POLICY "Users can view their own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own transactions
DROP POLICY IF EXISTS "Users can view their transactions" ON public.transactions;
CREATE POLICY "Users can view their transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);
