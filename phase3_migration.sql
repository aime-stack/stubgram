-- =====================================================
-- PHASE 3 MIGRATION: SCALING & AUDIT
-- =====================================================

-- 1. Create Audit Logs Table (Financial Compliance)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL CHECK (action IN ('DEPOSIT', 'WITHDRAW', 'ADJUST', 'SYSTEM_CORRECTION')),
    amount NUMERIC NOT NULL,
    reference_id TEXT, -- Paypack Transaction ID or similar
    before_balance NUMERIC,
    after_balance NUMERIC,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only System (Service Role) can INSERT
-- Users can VIEW their own logs
DROP POLICY IF EXISTS "Users view own audit logs" ON public.audit_logs;
CREATE POLICY "Users view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Enhance Reels Table for Transcoding
-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'processing_status') THEN
        ALTER TABLE public.reels ADD COLUMN processing_status TEXT DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'READY', 'FAILED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'original_url') THEN
        ALTER TABLE public.reels ADD COLUMN original_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'processed_url') THEN
        ALTER TABLE public.reels ADD COLUMN processed_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'duration') THEN
        ALTER TABLE public.reels ADD COLUMN duration NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'resolution') THEN
        ALTER TABLE public.reels ADD COLUMN resolution TEXT;
    END IF;
END $$;

-- 3. Indexing for Performance
CREATE INDEX IF NOT EXISTS idx_reels_processing_status ON public.reels(processing_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
