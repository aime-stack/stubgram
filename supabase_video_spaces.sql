-- =====================================================
-- VIDEO SPACES SCHEMA (Audio-First / Low Bandwidth)
-- =====================================================

-- 1. VIDEO_SPACES TABLE
CREATE TABLE IF NOT EXISTS public.video_spaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'invite')),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'live', 'ended', 'archived')),
  is_audio_only BOOLEAN NOT NULL DEFAULT TRUE,
  invite_code TEXT UNIQUE,
  max_participants INTEGER DEFAULT 50,
  participant_count INTEGER DEFAULT 1, -- Starts with host
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_video_spaces_status ON public.video_spaces(status);
CREATE INDEX IF NOT EXISTS idx_video_spaces_host ON public.video_spaces(host_id);
CREATE INDEX IF NOT EXISTS idx_video_spaces_invite ON public.video_spaces(invite_code) WHERE invite_code IS NOT NULL;

-- 2. PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.video_space_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.video_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('host', 'moderator', 'speaker', 'viewer')),
  is_muted BOOLEAN DEFAULT TRUE, -- Muted by default for African networks
  has_video BOOLEAN DEFAULT FALSE, -- Video off by default
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(space_id, user_id)
);

-- Index for presence queries
CREATE INDEX IF NOT EXISTS idx_participants_space ON public.video_space_participants(space_id, left_at);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.video_space_participants(user_id);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.video_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_space_participants ENABLE ROW LEVEL SECURITY;

-- VIDEO_SPACES POLICIES

-- View spaces: Anyone can see public/invite, only participants can see private
DROP POLICY IF EXISTS "View spaces" ON public.video_spaces;
CREATE POLICY "View spaces" ON public.video_spaces
  FOR SELECT USING (
    type IN ('public', 'invite') 
    OR host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.video_space_participants 
      WHERE space_id = video_spaces.id AND user_id = auth.uid() AND left_at IS NULL
    )
  );

-- Create: Only authenticated users can create
DROP POLICY IF EXISTS "Create spaces" ON public.video_spaces;
CREATE POLICY "Create spaces" ON public.video_spaces
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Update: Only host can update
DROP POLICY IF EXISTS "Update spaces" ON public.video_spaces;
CREATE POLICY "Update spaces" ON public.video_spaces
  FOR UPDATE USING (host_id = auth.uid());

-- PARTICIPANTS POLICIES

-- View: Participants visible to space members only
DROP POLICY IF EXISTS "View participants" ON public.video_space_participants;
CREATE POLICY "View participants" ON public.video_space_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.video_space_participants p
      WHERE p.space_id = video_space_participants.space_id 
      AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.video_spaces s
      WHERE s.id = video_space_participants.space_id 
      AND s.host_id = auth.uid()
    )
  );

-- Join: public = anyone, invite = with code, private = host approves (manual insert by host/edge function)
DROP POLICY IF EXISTS "Join space" ON public.video_space_participants;
CREATE POLICY "Join space" ON public.video_space_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.video_spaces s
      WHERE s.id = space_id AND (
        s.type = 'public'
        OR s.type = 'invite'
        OR s.host_id = auth.uid()
      )
    )
  );

-- Update own record: Mute/Video toggle
DROP POLICY IF EXISTS "Update own participation" ON public.video_space_participants;
CREATE POLICY "Update own participation" ON public.video_space_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Host/mods control: Mute/Kick others
DROP POLICY IF EXISTS "Moderator update" ON public.video_space_participants;
CREATE POLICY "Moderator update" ON public.video_space_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.video_space_participants p
      WHERE p.space_id = video_space_participants.space_id 
      AND p.user_id = auth.uid()
      AND p.role IN ('host', 'moderator')
    )
  );

-- 4. TRIGGERS / FUNCTIONS

-- Auto-insert host as participant on creation
CREATE OR REPLACE FUNCTION public.handle_space_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.video_space_participants (space_id, user_id, role, is_muted, has_video)
  VALUES (NEW.id, NEW.host_id, 'host', FALSE, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_space_created
  AFTER INSERT ON public.video_spaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_space_creation();

-- Success Message
DO $$
BEGIN
  RAISE NOTICE 'SnapGram Video Spaces schema (Milestone 1) created successfully!';
END $$;
