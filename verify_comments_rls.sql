-- =====================================================
-- Comments RLS Verification & Fix
-- =====================================================
-- This script verifies and corrects RLS policies for the comments table
-- to ensure authenticated users can INSERT comments and everyone can read them.

-- 1. Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'comments';

-- 2. View existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'comments';

-- 3. Drop existing policies (if any) to start fresh
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Comments are publicly readable" ON comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON comments;
DROP POLICY IF EXISTS "Enable read access for all users" ON comments;
DROP POLICY IF EXISTS "Comments viewable by everyone" ON comments;

-- 4. Enable RLS on comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 5. Create INSERT policy
-- Allow authenticated users to insert comments where user_id matches their auth.uid()
CREATE POLICY "Authenticated users can create comments" 
  ON comments 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- 6. Create SELECT policy
-- Allow all authenticated users to view all comments (public read)
CREATE POLICY "Comments are publicly readable" 
  ON comments 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 7. Optional: Allow users to UPDATE/DELETE their own comments
-- Uncomment if you want users to be able to edit or delete their comments

-- CREATE POLICY "Users can update their own comments" 
--   ON comments 
--   FOR UPDATE 
--   TO authenticated 
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can delete their own comments" 
--   ON comments 
--   FOR DELETE 
--   TO authenticated 
--   USING (auth.uid() = user_id);

-- 8. Verify policies were created
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'comments';

-- 9. Test INSERT (uncomment to test manually in Supabase SQL Editor)
-- Note: This will only work if you're authenticated as a user and the post_id exists
-- INSERT INTO comments (post_id, user_id, content)
-- VALUES ('some-valid-post-id', auth.uid(), 'Test comment');

-- 10. Test SELECT (uncomment to test manually)
-- SELECT * FROM comments ORDER BY created_at DESC LIMIT 10;
