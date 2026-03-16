# Brique Skool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extraire la fonctionnalite Academy en une brique autonome reutilisable dans `briques/skool/`.

**Architecture:** Copier les fichiers source de l'Academy, nettoyer le code (retirer quiz, library, revision, prerequis), creer une migration SQL autonome (CREATE TABLE complet), et ecrire un README d'installation.

**Tech Stack:** Next.js 16 App Router, Supabase (Auth + DB + Storage), shadcn/ui, Tailwind CSS 4, @dnd-kit, lucide-react, sonner

---

### Task 1: Creer la structure de dossiers

**Files:**

- Create: `briques/skool/` (directory structure)

**Step 1: Creer l'arborescence**

```bash
mkdir -p briques/skool/{app/\[courseId\],app/admin/\[courseId\],actions,components}
```

**Step 2: Verifier**

Run: `find briques/skool -type d`
Expected: toutes les sous-directories existent

**Step 3: Commit**

```bash
git add briques/
git commit -m "chore: init brique skool — structure dossiers"
```

---

### Task 2: Migration SQL autonome

**Files:**

- Create: `briques/skool/migration.sql`

**Step 1: Ecrire la migration**

La migration doit creer toutes les tables FROM SCRATCH (pas d'ALTER TABLE) pour fonctionner sur un projet vierge. Tables : `courses`, `course_modules`, `lessons`, `lesson_progress`. Plus le bucket Storage `academy` et les policies RLS.

Le contenu est base sur `supabase/migration-academy-modules.sql` + les tables existantes du schema Sales System, mais en version standalone :

```sql
-- Brique Skool — Migration autonome
-- Prerequis : table `profiles` avec colonnes `id` (UUID) et `role` (TEXT)

-- 1. Courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  position INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  target_roles TEXT[] DEFAULT ARRAY['admin','manager','setter','closer'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view published courses" ON courses
  FOR SELECT TO authenticated
  USING (is_published = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')
  ));

CREATE POLICY "Admin manage courses" ON courses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));

-- 2. Course Modules
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

ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view modules" ON course_modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage modules" ON course_modules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));

-- 3. Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  video_url TEXT,
  duration_minutes INT,
  attachments JSONB DEFAULT '[]'::jsonb,
  content_html TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_position ON lessons(module_id, position);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view lessons" ON lessons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage lessons" ON lessons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));

-- 4. Lesson Progress
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress" ON lesson_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own progress" ON lesson_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- 5. Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academy', 'academy', true, 104857600,
  ARRAY['image/jpeg','image/png','image/webp','image/gif',
        'video/mp4','video/webm',
        'application/pdf','application/zip',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read academy" ON storage.objects
  FOR SELECT USING (bucket_id = 'academy');

CREATE POLICY "Admin upload academy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'academy' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')
  ));

CREATE POLICY "Admin update academy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'academy' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')
  ));

CREATE POLICY "Admin delete academy" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'academy' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')
  ));
```

**Step 2: Commit**

```bash
git add briques/skool/migration.sql
git commit -m "feat(skool): migration SQL autonome — tables + RLS + storage"
```

---

### Task 3: Types TypeScript

**Files:**

- Create: `briques/skool/types.ts`

**Step 1: Extraire les types academy**

Copier depuis `src/lib/types/database.ts` uniquement les 4 types necessaires : `Course`, `CourseModule`, `Lesson`, `LessonProgress`. Retirer `has_prerequisites`, `quiz_score`, `transcript` (non utilises dans la brique). Garder la structure exacte pour le reste.

```typescript
// Brique Skool — Types
// A copier/merger dans src/lib/types/database.ts de votre projet

export interface Course {
  id: string;
  title: string;
  description: string | null;
  position: number;
  thumbnail_url: string | null;
  is_published: boolean;
  target_roles: string[];
  created_at: string;
  lessons?: Lesson[];
  modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  position: number;
  video_url: string | null;
  duration_minutes: number | null;
  attachments: Array<{ name: string; url: string; type: string }>;
  content_html: string | null;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}
```

**Step 2: Commit**

```bash
git add briques/skool/types.ts
git commit -m "feat(skool): types TypeScript — Course, Module, Lesson, Progress"
```

---

### Task 4: Server actions — Admin CRUD

**Files:**

- Create: `briques/skool/actions/academy-admin.ts`

**Step 1: Copier tel quel**

Copier `src/lib/actions/academy-admin.ts` sans aucune modification. Le fichier est deja autonome (pas de dependance quiz/library/revision).

**Step 2: Commit**

```bash
git add briques/skool/actions/academy-admin.ts
git commit -m "feat(skool): server actions admin CRUD — courses, modules, lecons"
```

---

### Task 5: Server actions — Student (nettoyage)

**Files:**

- Create: `briques/skool/actions/academy.ts`

**Step 1: Copier et nettoyer**

Copier `src/lib/actions/academy.ts` en retirant les fonctions :

- `getCourseWithPrerequisites()` — prerequis, exclu
- `submitQuizAttempt()` — quiz, exclu
- `getQuizAttempts()` — quiz, exclu
- `getResourceLibrary()` — library, exclu
- `getRevisionCards()` — revision, exclu
- `aiCorrectExercise()` — AI stub, exclu

Garder uniquement :

- `getCoursesWithModules()` — grille formations
- `getCourseDetail()` — detail cours (RETIRER quizMap et prerequisites du retour)
- `markLessonComplete()` — progression manuelle
- `trackVideoProgress()` — auto-completion 80%

Pour `getCourseDetail()`, simplifier en retirant :

- Le fetch des quizzes
- Le fetch des prerequisites
- Les champs `quizMap`, `prerequisites`, `allPrereqsMet` du retour

Le retour simplifie de `getCourseDetail()` :

```typescript
return {
  course: { ...course, modules },
  progressMap,
};
```

**Step 2: Commit**

```bash
git add briques/skool/actions/academy.ts
git commit -m "feat(skool): server actions student — cours, progression, video"
```

---

### Task 6: Composant FileUpload

**Files:**

- Create: `briques/skool/components/file-upload.tsx`

**Step 1: Copier tel quel**

Copier `src/components/ui/file-upload.tsx` sans modification. Le composant est deja generique et autonome.

**Step 2: Commit**

```bash
git add briques/skool/components/file-upload.tsx
git commit -m "feat(skool): composant FileUpload — drag-drop Supabase Storage"
```

---

### Task 7: Pages Student — Grille des formations

**Files:**

- Create: `briques/skool/app/page.tsx`
- Create: `briques/skool/app/course-grid.tsx`

**Step 1: Copier page.tsx**

Copier `src/app/(app)/academy/page.tsx` tel quel. Pas de dependance quiz/library.

**Step 2: Copier course-grid.tsx**

Copier `src/app/(app)/academy/course-grid.tsx` tel quel. Ajouter le composant `PageHeader` inline dans le fichier (3 lignes) pour eviter une dependance externe :

Ajouter en haut du fichier (apres les imports) :

```typescript
// Inline PageHeader — adaptez selon votre layout
function PageHeader({ title, description, children }: {
  title: string; description?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 mt-4 sm:mt-0">{children}</div>}
    </div>
  );
}
```

Et retirer `import { PageHeader } from "@/components/layout/page-header"`.

**Step 3: Commit**

```bash
git add briques/skool/app/page.tsx briques/skool/app/course-grid.tsx
git commit -m "feat(skool): pages student — grille formations avec filtres"
```

---

### Task 8: Pages Student — Lecteur de cours

**Files:**

- Create: `briques/skool/app/[courseId]/page.tsx`
- Create: `briques/skool/app/[courseId]/course-view.tsx`

**Step 1: Copier et nettoyer page.tsx**

Copier `src/app/(app)/academy/[courseId]/page.tsx` en retirant TOUT le code quiz :

- Supprimer `lessonIdsWithQuiz`, `quizAttempts`, le if-block qui fetch `quiz_attempts`
- Retirer les props `quizMap`, `prerequisites`, `allPrereqsMet`, `quizAttempts` du JSX CourseView
- Adapter au nouveau retour de `getCourseDetail()` qui ne renvoie plus `quizMap`/`prerequisites`/`allPrereqsMet`

Le page.tsx simplifie :

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCourseDetail } from "@/lib/actions/academy";
import { CourseView } from "./course-view";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getCourseDetail(courseId);
  if (!result) notFound();

  return (
    <CourseView
      course={result.course}
      progressMap={result.progressMap}
      userId={user.id}
    />
  );
}
```

**Step 2: Copier et nettoyer course-view.tsx**

Copier `src/app/(app)/academy/[courseId]/course-view.tsx` en retirant :

- Les imports `submitQuizAttempt`
- L'interface `PrerequisiteInfo` et `QuizAttemptInfo`
- Les props `quizMap`, `prerequisites`, `allPrereqsMet`, `quizAttempts` de `CourseViewProps`
- Tout le state quiz : `quizOpen`, `quizAnswers`, `quizSubmitted`, `quizScore`, `submitting`
- Les fonctions : `getQuizForLesson()`, `isQuizLocked()`, `handleQuizSubmit()`
- Les variables : `activeQuiz`, `activeAttempts`
- Le rendu des prerequis (banner `!allPrereqsMet`)
- Le rendu du quiz section
- Le bouton "Passer le quiz"
- Simplifier `isLessonUnlocked` : retirer `if (!allPrereqsMet)`, juste verifier la lecon precedente

Le composant simplifie garde : sidebar modules collapsibles, video player, attachments, progression, navigation prev/next.

**Step 3: Commit**

```bash
git add briques/skool/app/\[courseId\]/
git commit -m "feat(skool): pages student — lecteur de cours (video, sidebar, progression)"
```

---

### Task 9: Pages Admin — Liste des formations

**Files:**

- Create: `briques/skool/app/admin/page.tsx`
- Create: `briques/skool/app/admin/course-list.tsx`
- Create: `briques/skool/app/admin/course-form-dialog.tsx`

**Step 1: Copier les 3 fichiers**

- `admin/page.tsx` — copier `src/app/(app)/academy/admin/page.tsx` tel quel
- `admin/course-list.tsx` — copier `src/app/(app)/academy/admin/course-list.tsx`, inliner `PageHeader` (meme pattern que Task 7)
- `admin/course-form-dialog.tsx` — copier `src/app/(app)/academy/admin/course-form-dialog.tsx` tel quel

**Step 2: Commit**

```bash
git add briques/skool/app/admin/
git commit -m "feat(skool): pages admin — liste formations, CRUD, publish toggle"
```

---

### Task 10: Pages Admin — Editeur de cours

**Files:**

- Create: `briques/skool/app/admin/[courseId]/page.tsx`
- Create: `briques/skool/app/admin/[courseId]/course-editor.tsx`
- Create: `briques/skool/app/admin/[courseId]/module-form-dialog.tsx`
- Create: `briques/skool/app/admin/[courseId]/lesson-form-dialog.tsx`

**Step 1: Copier les 4 fichiers**

Tous copiees tel quel depuis `src/app/(app)/academy/admin/[courseId]/`. Aucun nettoyage necessaire — ces fichiers ne contiennent ni quiz ni library ni revision.

**Step 2: Commit**

```bash
git add briques/skool/app/admin/\[courseId\]/
git commit -m "feat(skool): pages admin — editeur cours, DnD modules/lecons"
```

---

### Task 11: README d'installation

**Files:**

- Create: `briques/skool/README.md`

**Step 1: Ecrire le README**

Le README doit expliquer :

1. Ce que fait la brique
2. Les prerequis (stack, packages, table profiles)
3. Les 3 etapes d'installation (SQL, copie fichiers, verif imports)
4. La structure des fichiers et ou les mettre
5. Les composants shadcn necessaires

**Step 2: Commit**

```bash
git add briques/skool/README.md
git commit -m "docs(skool): README installation — guide 3 etapes"
```

---

### Task 12: Verification finale

**Step 1: Verifier l'arborescence**

Run: `find briques/skool -type f | sort`

Expected: 15 fichiers au total :

```
briques/skool/README.md
briques/skool/migration.sql
briques/skool/types.ts
briques/skool/actions/academy.ts
briques/skool/actions/academy-admin.ts
briques/skool/components/file-upload.tsx
briques/skool/app/page.tsx
briques/skool/app/course-grid.tsx
briques/skool/app/[courseId]/page.tsx
briques/skool/app/[courseId]/course-view.tsx
briques/skool/app/admin/page.tsx
briques/skool/app/admin/course-list.tsx
briques/skool/app/admin/course-form-dialog.tsx
briques/skool/app/admin/[courseId]/page.tsx
briques/skool/app/admin/[courseId]/course-editor.tsx
briques/skool/app/admin/[courseId]/module-form-dialog.tsx
briques/skool/app/admin/[courseId]/lesson-form-dialog.tsx
```

**Step 2: Verifier qu'aucune reference quiz/library/revision ne reste**

Run: `grep -r "quiz\|library\|revision\|prerequisite\|prereq\|flashcard" briques/skool/ --include="*.ts" --include="*.tsx" -l`

Expected: aucun resultat (0 fichiers)

**Step 3: Verifier les imports**

Run: `grep -r "from \"@/" briques/skool/ --include="*.ts" --include="*.tsx" -n`

Les imports autorises :

- `@/lib/supabase/server` et `@/lib/supabase/client`
- `@/lib/actions/academy` et `@/lib/actions/academy-admin`
- `@/lib/types/database` (uniquement dans admin/[courseId]/page.tsx et course-editor.tsx)
- `@/lib/utils` (cn helper)
- `@/components/ui/*` (shadcn composants)
- `@/components/ui/file-upload`

Pas d'import vers `@/components/layout/page-header` (inline dans la brique).

**Step 4: Commit final**

```bash
git add briques/
git commit -m "feat: brique Skool complete — formation reutilisable (15 fichiers)"
```
