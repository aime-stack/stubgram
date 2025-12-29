-- =====================================================
-- FIX: WALLET SECURITY (CRITICAL)
-- Revokes public UPDATE permission on wallets table
-- =====================================================

-- 1. Drop the insecure and old policies if they exist
DROP POLICY IF EXISTS "System can update wallets" ON public.wallets;
DROP POLICY IF EXISTS "Anyone can view wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;

-- 2. Create correct policy: NO public updates allowed.
-- Only Service Role (Backend) can update wallets (bypasses RLS).
CREATE POLICY "Users can view their own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Payment State Hardening
-- Drop constraint if it exists to avoid error on re-run
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS balance_non_negative;

ALTER TABLE public.wallets 
  ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);

DO $$
BEGIN
  RAISE NOTICE 'Fixed Wallet RLS Policies and Constraints.';
END $$;
