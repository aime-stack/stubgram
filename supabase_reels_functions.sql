-- =====================================================
-- REELS ENGAGEMENT FUNCTIONS
-- =====================================================

-- Function to safely increment reel views
CREATE OR REPLACE FUNCTION increment_reel_views(p_reel_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.reels
  SET views_count = views_count + 1
  WHERE id = p_reel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reels_updated_at
    BEFORE UPDATE ON public.reels
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
