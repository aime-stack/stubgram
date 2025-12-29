-- Fix Storage RLS policies for avatars, posts, reels, and stories

-- 1. Avatars Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar Upload" ON storage.objects;
CREATE POLICY "Avatar Upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Avatar Update" ON storage.objects;
CREATE POLICY "Avatar Update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Avatar Delete" ON storage.objects;
CREATE POLICY "Avatar Delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Avatar View" ON storage.objects;
CREATE POLICY "Avatar View" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- 2. Posts Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Post Media Upload" ON storage.objects;
CREATE POLICY "Post Media Upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'posts' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Post Media View" ON storage.objects;
CREATE POLICY "Post Media View" ON storage.objects
    FOR SELECT USING (bucket_id = 'posts');

-- 3. Reels Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Reel Media Upload" ON storage.objects;
CREATE POLICY "Reel Media Upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'reels' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Reel Media View" ON storage.objects;
CREATE POLICY "Reel Media View" ON storage.objects
    FOR SELECT USING (bucket_id = 'reels');

-- 4. Stories Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Story Media Upload" ON storage.objects;
CREATE POLICY "Story Media Upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'stories' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Story Media View" ON storage.objects;
CREATE POLICY "Story Media View" ON storage.objects
    FOR SELECT USING (bucket_id = 'stories');

-- 5. Courses Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('courses', 'courses', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Course Media Upload" ON storage.objects;
CREATE POLICY "Course Media Upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'courses' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Course Media View" ON storage.objects;
CREATE POLICY "Course Media View" ON storage.objects
    FOR SELECT USING (bucket_id = 'courses');
