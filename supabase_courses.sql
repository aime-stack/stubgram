-- =====================================================
-- COURSE MARKETPLACE SCHEMA ADDITIONS
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- 1. TEACHER APPLICATIONS TABLE
-- Users apply to become teachers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.teacher_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  youtube_channel_url TEXT NOT NULL,
  bio TEXT NOT NULL,
  expertise TEXT[] NOT NULL,
  sample_content_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own application" ON public.teacher_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create application" ON public.teacher_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all" ON public.teacher_applications
  FOR SELECT USING (true);

-- =====================================================
-- 2. ADD is_teacher COLUMN TO PROFILES
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_teacher'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_teacher BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- =====================================================
-- 3. COURSE LESSONS TABLE
-- Multiple lessons per course
-- =====================================================
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'text', 'pdf')),
  -- For video: YouTube embed URL
  video_url TEXT,
  -- For text: markdown content
  text_content TEXT,
  -- For PDF: URL to PDF file
  pdf_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT FALSE, -- Free preview lessons
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons" ON public.course_lessons
  FOR SELECT USING (true);

CREATE POLICY "Teachers can manage their lessons" ON public.course_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_lessons.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- 4. LESSON PROGRESS TABLE
-- Track user progress per lesson
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE enrollments.id = lesson_progress.enrollment_id 
      AND enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own progress" ON public.lesson_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE enrollments.id = lesson_progress.enrollment_id 
      AND enrollments.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. UPDATE ENROLLMENTS TABLE
-- Add more fields for progress tracking
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enrollments' AND column_name = 'last_lesson_id'
  ) THEN
    ALTER TABLE public.enrollments ADD COLUMN last_lesson_id UUID REFERENCES public.course_lessons(id);
  END IF;
END $$;

-- =====================================================
-- 6. FUNCTIONS FOR ENROLLMENT
-- =====================================================

-- Enroll with coins (atomic transaction)
CREATE OR REPLACE FUNCTION enroll_with_coins(
  p_user_id UUID,
  p_course_id UUID
) RETURNS UUID AS $$
DECLARE
  v_price INTEGER;
  v_balance INTEGER;
  v_enrollment_id UUID;
BEGIN
  -- Get course price
  SELECT price_coins INTO v_price FROM public.courses WHERE id = p_course_id;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  -- Get user balance
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id;
  IF v_balance IS NULL OR v_balance < v_price THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  -- Deduct coins
  UPDATE public.wallets 
  SET balance = balance - v_price,
      total_spent = total_spent + v_price,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Create enrollment
  INSERT INTO public.enrollments (user_id, course_id, progress, created_at)
  VALUES (p_user_id, p_course_id, 0, NOW())
  RETURNING id INTO v_enrollment_id;

  -- Increment course students count
  UPDATE public.courses 
  SET students_count = students_count + 1 
  WHERE id = p_course_id;

  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, description, reference_id, status)
  VALUES (p_user_id, 'spend', -v_price, 'Course enrollment', p_course_id::TEXT, 'completed');

  RETURN v_enrollment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate course progress
CREATE OR REPLACE FUNCTION calculate_course_progress(p_enrollment_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_lessons 
  FROM public.course_lessons cl
  JOIN public.enrollments e ON e.course_id = cl.course_id
  WHERE e.id = p_enrollment_id;

  SELECT COUNT(*) INTO v_completed_lessons 
  FROM public.lesson_progress lp
  WHERE lp.enrollment_id = p_enrollment_id AND lp.completed = TRUE;

  IF v_total_lessons = 0 THEN
    RETURN 0;
  END IF;

  RETURN (v_completed_lessons * 100) / v_total_lessons;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION enroll_with_coins(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_course_progress(UUID) TO authenticated;

-- =====================================================
-- SUCCESS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Course marketplace schema created successfully!';
  RAISE NOTICE 'Tables: teacher_applications, course_lessons, lesson_progress';
  RAISE NOTICE 'Functions: enroll_with_coins, calculate_course_progress';
END $$;
