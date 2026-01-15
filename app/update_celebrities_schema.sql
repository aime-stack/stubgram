-- Update profiles table to support VIP Celebrity Chat features

BEGIN;

-- Add new columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS message_price INTEGER DEFAULT 500;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 1) DEFAULT 4.8;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Add index for checking celebrity status and category for faster filtering
CREATE INDEX IF NOT EXISTS profiles_is_celebrity_idx ON public.profiles(is_celebrity) WHERE is_celebrity = TRUE;
CREATE INDEX IF NOT EXISTS profiles_category_idx ON public.profiles(category);

COMMIT;
