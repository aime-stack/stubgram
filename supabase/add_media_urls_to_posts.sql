-- Add media_urls for multi-file/carousel support
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_urls JSONB;

-- Add original_metadata for aspect ratio calculations etc.
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS original_metadata JSONB;

-- Add aspect_ratio for layout
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS aspect_ratio FLOAT DEFAULT 1.0;

-- Ensure RLS allows updates to these (though usually INSERT handles new columns if policies are generic)
-- Existing policies are likely:
-- CREATE POLICY "Users can create their own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
-- This usually covers all columns automatically unless restricted.
