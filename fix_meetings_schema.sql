-- Force schema update for meetings table
-- Attempt to add columns if they don't exist, handling the table existence check

DO $$ 
BEGIN 
    -- 1. Add matching columns if missing
    BEGIN
        ALTER TABLE public.meetings ADD COLUMN start_time TIMESTAMPTZ;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.meetings ADD COLUMN is_password_protected BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Update meetings status check
    BEGIN
        ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
        ALTER TABLE public.meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('scheduled', 'live', 'ended', 'active'));
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;

    -- Update meetings type check to ensure 'public' and 'private' are allowed
    BEGIN
        ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_type_check;
        ALTER TABLE public.meetings ADD CONSTRAINT meetings_type_check CHECK (type IN ('1-on-1', 'group', 'public', 'private', 'scheduled'));
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;

    -- Update ads to have budget_coins
    BEGIN
        ALTER TABLE public.ads ADD COLUMN budget_coins INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Add community_id to posts if not exists
    BEGIN
        ALTER TABLE public.posts ADD COLUMN community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;


    BEGIN
        ALTER TABLE public.meetings ADD COLUMN meeting_password TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- 2. Rename meeting_link to meeting_id if it exists (for compatibility)
    -- If meeting_id already exists, we do nothing. If meeting_link exists, we rename it.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetings' AND column_name='meeting_link') THEN
        ALTER TABLE public.meetings RENAME COLUMN meeting_link TO meeting_id;
    END IF;

    -- 3. Reload schema cache (Supabase specific)
    NOTIFY pgrst, 'reload schema';
END $$;
