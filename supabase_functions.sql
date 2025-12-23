-- =====================================================
-- SNAPGRAM DATABASE FUNCTIONS
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- Function to increment shares count on a post
CREATE OR REPLACE FUNCTION increment_shares_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts 
  SET shares_count = shares_count + 1 
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment comments count on a post
CREATE OR REPLACE FUNCTION increment_post_comment_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts 
  SET comments_count = comments_count + 1 
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement comments count on a post
CREATE OR REPLACE FUNCTION decrement_post_comment_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts 
  SET comments_count = GREATEST(0, comments_count - 1) 
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add reshared_from column to posts if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'reshared_from'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN reshared_from UUID REFERENCES public.posts(id);
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_shares_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_comment_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_comment_count(UUID) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database functions created successfully!';
END $$;
