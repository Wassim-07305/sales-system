-- Migration: Academy Modules (Skool-like hierarchy)
-- Course → Module → Lesson

-- 1. Create course_modules table
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_position ON course_modules(course_id, position);

-- 2. Add module_id and content_html to lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_html TEXT;

CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);

-- 3. Data migration: create default module per course, assign orphan lessons
INSERT INTO course_modules (course_id, title, position)
SELECT DISTINCT c.id, 'Général', 0
FROM courses c
JOIN lessons l ON l.course_id = c.id
WHERE l.module_id IS NULL
ON CONFLICT DO NOTHING;

UPDATE lessons l
SET module_id = cm.id
FROM course_modules cm
WHERE l.course_id = cm.course_id
  AND l.module_id IS NULL
  AND cm.title = 'Général'
  AND cm.position = 0;

-- 4. RLS for course_modules
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view modules" ON course_modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/manager can insert modules" ON course_modules
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Admin/manager can update modules" ON course_modules
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Admin/manager can delete modules" ON course_modules
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- 5. Add admin management policies for courses, lessons, quizzes (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Admin can manage courses') THEN
    CREATE POLICY "Admin can manage courses" ON courses
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lessons' AND policyname = 'Admin can manage lessons') THEN
    CREATE POLICY "Admin can manage lessons" ON lessons
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'Admin can manage quizzes') THEN
    CREATE POLICY "Admin can manage quizzes" ON quizzes
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));
  END IF;
END $$;

-- 6. Create storage bucket for academy assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academy',
  'academy',
  true,
  104857600,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf', 'application/zip', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage RLS policies
CREATE POLICY "Public read academy" ON storage.objects
  FOR SELECT USING (bucket_id = 'academy');

CREATE POLICY "Admin upload academy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academy'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admin update academy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academy'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admin delete academy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'academy'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
