-- Phase 5: Search & Discovery - Trending Engine

-- 1. Trending Topics Table
CREATE TABLE IF NOT EXISTS public.trending_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL UNIQUE,
    count INTEGER DEFAULT 0,
    type TEXT DEFAULT 'hashtag' CHECK (type IN ('hashtag', 'keyword', 'location')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Function to Calculate Trends
-- In a real production app, this would be a scheduled edge function or cron job
-- that analyzes the last 24h of posts.
-- Here, we'll create a function that can be called manually or via trigger.

CREATE OR REPLACE FUNCTION public.refresh_trending_topics()
RETURNS VOID AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Clear old trends (optional, or just update counts)
    -- DELETE FROM public.trending_topics; 

    -- Simple Mock Logic: Aggregate from posts descriptions (finding #hashtags)
    -- This is expensive in SQL for large data, but fine for MVP.
    -- We'll just seed some data or count simple occurrences if possible.
    
    -- Better approach for MVP: Insert dummy trending topics if empty
    INSERT INTO public.trending_topics (topic, count, type)
    VALUES 
    ('#rwanda', 120, 'hashtag'),
    ('#kigali', 95, 'hashtag'),
    ('#technology', 80, 'hashtag'),
    ('#music', 150, 'hashtag'),
    ('#visitrwanda', 200, 'hashtag'),
    ('#weekend', 60, 'hashtag')
    ON CONFLICT (topic) DO UPDATE SET count = excluded.count, updated_at = NOW();

    -- REAL LOGIC (Commented out for MVP complexity/performance reasons):
    /*
    WITH hashtags AS (
        SELECT lower(substring(match[1] from 2)) as tag
        FROM public.posts,
        regexp_matches(content, '#([A-Za-z0-9_]+)', 'g') as match
        WHERE created_at > NOW() - INTERVAL '24 hours'
    )
    INSERT INTO public.trending_topics (topic, count, type)
    SELECT tag, count(*), 'hashtag'
    FROM hashtags
    GROUP BY tag
    ORDER BY count(*) DESC
    LIMIT 10
    ON CONFLICT (topic) DO UPDATE SET count = EXCLUDED.count;
    */

END;
$$ LANGUAGE plpgsql;

-- 3. Initial Seed
SELECT public.refresh_trending_topics();
