-- Function to fetch stories feed
CREATE OR REPLACE FUNCTION get_stories_feed(p_viewer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'user', JSONB_BUILD_OBJECT(
                    'id', p.id,
                    'username', p.username,
                    'avatar', p.avatar_url,
                    'isVerified', p.is_verified,
                    'isCelebrity', p.is_celebrity
                ),
                'stories', stories_data.stories,
                'hasUnseen', stories_data.has_unseen,
                'latestCreatedAt', stories_data.latest_created_at
            ) ORDER BY 
                CASE WHEN stories_data.has_unseen THEN 0 ELSE 1 END, -- Unseen first
                stories_data.latest_created_at DESC -- Then recent
        ),
        '[]'::JSONB
    ) INTO v_result
    FROM (
        SELECT 
            s.user_id,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', s.id,
                    'userId', s.user_id,
                    'type', s.type,
                    'mediaUrl', s.media_url,
                    'content', s.content,
                    'backgroundColor', s.background_color,
                    'createdAt', s.created_at,
                    'expiresAt', s.expires_at,
                    'duration', 5, -- Default duration, can be dynamic later
                    'isViewed', (sv.id IS NOT NULL),
                    'viewsCount', (SELECT COUNT(*) FROM public.story_views v WHERE v.story_id = s.id)
                ) ORDER BY s.created_at ASC
            ) as stories,
            BOOL_OR(sv.id IS NULL) as has_unseen,
            MAX(s.created_at) as latest_created_at
        FROM public.stories s
        LEFT JOIN public.story_views sv 
            ON s.id = sv.story_id 
            AND sv.user_id = p_viewer_id
        WHERE s.expires_at > NOW()
        GROUP BY s.user_id
    ) stories_data
    JOIN public.profiles p ON p.id = stories_data.user_id;

    RETURN v_result;
END;
$$;
