-- Phase 4: Ecosystem & Privacy

-- 1. Ensure Profiles have account_type
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'regular' CHECK (account_type IN ('regular', 'premium', 'vip', 'industry'));

-- 2. Update Conversations for Request Logic
-- Assuming 'conversations' table exists (if not, we create it)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
     -- Status for the RECIPIENT. 
     -- This is complex for 1:1. Usually we track status per participant.
     -- Simplified approach: Add status to conversation, but who is it pending for?
     -- Better approach: conversation_participants table with status.
     status TEXT DEFAULT 'active' -- Legacy fallback
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked', 'archived')),
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. Function to handle New Conversation Logic (The 60% Rule)
CREATE OR REPLACE FUNCTION public.handle_new_conversation()
RETURNS TRIGGER AS $$
DECLARE
    approver_id UUID;
    initiator_id UUID;
    is_followed BOOLEAN;
BEGIN
    -- We need to know who started it and who is receiving.
    -- This trigger might be hard on 'conversations' insert since we don't know participants yet.
    -- Better to trigger on 'conversation_participants' insert? 
    -- Or purely handle this in the API/Application layer?
    -- DECISION: For now, we will add a 'status' column to 'conversation_participants' and default it.
    -- The Application API (createConversation) should check the 'following' status and set 'pending' if needed.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RLS Updates
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversation_participants;
CREATE POLICY "Users can view their own conversations" ON public.conversation_participants 
FOR SELECT USING (user_id = auth.uid());

-- 5. Spam/Privacy Filters (Basic)
-- We can add a function to auto-block keyword spam if needed, but for now 'pending' status is enough.
