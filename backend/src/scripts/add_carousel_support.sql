-- Phase 2: Carousel Posts Support
-- Add media_urls array column to store multiple media items

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_media_urls ON public.posts USING GIN (media_urls);

COMMENT ON COLUMN public.posts.media_urls IS 'Array of media URLs for carousel posts. Structure: [{"url": "...", "type": "image|video", "aspectRatio": 1.5}]';
