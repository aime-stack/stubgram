-- Add missing foreign key for stories -> profiles
ALTER TABLE public.stories
DROP CONSTRAINT IF EXISTS stories_user_id_fkey;

ALTER TABLE public.stories
ADD CONSTRAINT stories_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Create story_views table
CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view story views" ON public.story_views;
DROP POLICY IF EXISTS "Users can insert their own story views" ON public.story_views;

CREATE POLICY "Anyone can view story views" ON public.story_views
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own story views" ON public.story_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);
