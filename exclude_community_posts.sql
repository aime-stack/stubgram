-- =====================================================
-- ISOLATE COMMUNITY POSTS
-- =====================================================

-- 1. Update POSTS Policy
-- Drop existing select policy to replace it
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

DROP POLICY IF EXISTS "Global and Community Post Visibility" ON public.posts;
CREATE POLICY "Global and Community Post Visibility" ON public.posts
FOR SELECT USING (
    -- Case 1: Global Post (no community) -> Visible to all
    community_id IS NULL
    OR
    -- Case 2: Community Post -> Visible if Community is Public OR User is Member
    EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = posts.community_id
        AND (
            -- Public Community: Visible to all
            c.is_private = FALSE
            OR
            -- Private Community: Visible only to members
            EXISTS (
                SELECT 1 FROM public.community_members cm
                WHERE cm.community_id = c.id
                AND cm.user_id = auth.uid()
            )
        )
    )
);

-- 2. Update COMMENTS Policy
-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;

DROP POLICY IF EXISTS "Comment on Visible Posts" ON public.comments;
CREATE POLICY "Comment on Visible Posts" ON public.comments
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.id = comments.post_id
        AND (
            -- If global post, allow
            p.community_id IS NULL
            OR
            -- If community post, enforce membership for commenting (stricter than viewing)
            EXISTS (
                SELECT 1 FROM public.community_members cm
                WHERE cm.community_id = p.community_id
                AND cm.user_id = auth.uid()
            )
        )
    )
);
