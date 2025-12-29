
-- 1. Helper function to check participation without RLS recursion
CREATE OR REPLACE FUNCTION public.is_space_participant(space_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.video_space_participants
    WHERE space_id = space_uuid AND user_id = auth.uid() AND left_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to check moderator status (host or moderator role)
CREATE OR REPLACE FUNCTION public.is_space_moderator(space_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.video_space_participants
    WHERE space_id = space_uuid 
    AND user_id = auth.uid() 
    AND role IN ('host', 'moderator')
    AND left_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update "video_spaces" policies
DROP POLICY IF EXISTS "View spaces" ON public.video_spaces;
CREATE POLICY "View spaces" ON public.video_spaces
  FOR SELECT USING (
    type IN ('public', 'invite') 
    OR host_id = auth.uid()
    OR public.is_space_participant(id)
  );

-- 4. Update "video_space_participants" policies
DROP POLICY IF EXISTS "View participants" ON public.video_space_participants;
CREATE POLICY "View participants" ON public.video_space_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.video_spaces s
      WHERE s.id = space_id AND (
        s.type IN ('public', 'invite')
        OR s.host_id = auth.uid()
      )
    )
    OR user_id = auth.uid()
    OR public.is_space_participant(space_id)
  );

DROP POLICY IF EXISTS "Moderator update" ON public.video_space_participants;
CREATE POLICY "Moderator update" ON public.video_space_participants
  FOR UPDATE USING (
    public.is_space_moderator(space_id)
  );
