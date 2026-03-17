"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/actions/notifications";

// Helper: require admin or manager role
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    throw new Error("Accès refusé");
  }

  return { supabase, userId: user.id };
}

// ─── Course CRUD ──────────────────────────────────────────

export async function getAdminCourses() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("courses")
    .select(
      "*, modules:course_modules(id, title, position, lessons:lessons(id))",
    )
    .order("position", { ascending: true });

  return (data || []).map((c: Record<string, unknown>) => ({
    ...c,
    modules: Array.isArray(c.modules) ? c.modules : [],
  }));
}

export async function createCourse(data: {
  title: string;
  description?: string;
  thumbnail_url?: string;
  target_roles?: string[];
  is_published?: boolean;
}) {
  const { supabase } = await requireAdmin();

  // Get max position
  const { data: last } = await supabase
    .from("courses")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (last?.position ?? -1) + 1;

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      title: data.title,
      description: data.description || null,
      thumbnail_url: data.thumbnail_url || null,
      target_roles: data.target_roles || [
        "setter",
        "closer",
        "client_b2b",
        "client_b2c",
      ],
      is_published: data.is_published ?? false,
      position,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");

  // Notifier les users du role cible
  try {
    const targetRoles = data.target_roles || [
      "setter",
      "closer",
      "client_b2b",
      "client_b2c",
    ];
    const { data: targetUsers } = await supabase
      .from("profiles")
      .select("id")
      .in("role", targetRoles);
    for (const u of (targetUsers || []).slice(0, 50)) {
      await notify(
        u.id,
        "Nouveau contenu disponible",
        `"${data.title}" a été ajouté dans l'Academy`,
        {
          link: "/academy",
          type: "content_update",
        },
      );
    }
  } catch {
    /* ignore notification errors */
  }

  return course?.id;
}

export async function updateCourse(
  courseId: string,
  data: {
    title?: string;
    description?: string;
    thumbnail_url?: string;
    target_roles?: string[];
    is_published?: boolean;
  },
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("courses")
    .update(data)
    .eq("id", courseId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");

  // Notifier les users du role cible
  try {
    const { data: course } = await supabase
      .from("courses")
      .select("target_roles")
      .eq("id", courseId)
      .single();
    const targetRoles = course?.target_roles || [
      "admin",
      "manager",
      "setter",
      "closer",
    ];
    const { data: targetUsers } = await supabase
      .from("profiles")
      .select("id")
      .in("role", targetRoles);
    for (const u of (targetUsers || []).slice(0, 50)) {
      await notify(
        u.id,
        "Nouveau contenu disponible",
        `"${data.title || "Un cours"}" a été modifié dans l'Academy`,
        {
          link: "/academy",
          type: "content_update",
        },
      );
    }
  } catch {
    /* ignore notification errors */
  }
}

export async function deleteCourse(courseId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("courses").delete().eq("id", courseId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function reorderCourses(orderedIds: string[]) {
  const { supabase } = await requireAdmin();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("courses")
      .update({ position: i })
      .eq("id", orderedIds[i]);
  }

  revalidatePath("/academy", "page");
}

// ─── Module CRUD ──────────────────────────────────────────

export async function createModule(data: {
  course_id: string;
  title: string;
  description?: string;
}) {
  const { supabase } = await requireAdmin();

  const { data: last } = await supabase
    .from("course_modules")
    .select("position")
    .eq("course_id", data.course_id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (last?.position ?? -1) + 1;

  const { data: mod, error } = await supabase
    .from("course_modules")
    .insert({
      course_id: data.course_id,
      title: data.title,
      description: data.description || null,
      position,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
  return mod?.id;
}

export async function updateModule(
  moduleId: string,
  data: {
    title?: string;
    description?: string;
  },
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("course_modules")
    .update(data)
    .eq("id", moduleId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function deleteModule(moduleId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("course_modules")
    .delete()
    .eq("id", moduleId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function reorderModules(
  courseId: string,
  orderedModuleIds: string[],
) {
  const { supabase } = await requireAdmin();

  for (let i = 0; i < orderedModuleIds.length; i++) {
    await supabase
      .from("course_modules")
      .update({ position: i })
      .eq("id", orderedModuleIds[i]);
  }

  revalidatePath("/academy", "page");
}

// ─── Lesson CRUD ──────────────────────────────────────────

export async function createLesson(data: {
  course_id: string;
  module_id: string;
  title: string;
  description?: string;
  video_url?: string;
  duration_minutes?: number;
}) {
  const { supabase } = await requireAdmin();

  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .eq("module_id", data.module_id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (last?.position ?? -1) + 1;

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({
      course_id: data.course_id,
      module_id: data.module_id,
      title: data.title,
      description: data.description || null,
      video_url: data.video_url || null,
      duration_minutes: data.duration_minutes || null,
      position,
      attachments: [],
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");

  // Notifier les users du role cible
  try {
    const { data: course } = await supabase
      .from("courses")
      .select("target_roles")
      .eq("id", data.course_id)
      .single();
    const targetRoles = course?.target_roles || [
      "admin",
      "manager",
      "setter",
      "closer",
    ];
    const { data: targetUsers } = await supabase
      .from("profiles")
      .select("id")
      .in("role", targetRoles);
    for (const u of (targetUsers || []).slice(0, 50)) {
      await notify(
        u.id,
        "Nouveau contenu disponible",
        `"${data.title}" a été ajouté dans l'Academy`,
        {
          link: "/academy",
          type: "content_update",
        },
      );
    }
  } catch {
    /* ignore notification errors */
  }

  return lesson?.id;
}

export async function updateLesson(
  lessonId: string,
  data: {
    title?: string;
    description?: string;
    video_url?: string | null;
    subtitle_url?: string | null;
    duration_minutes?: number | null;
    content_html?: string | null;
    attachments?: Array<{ name: string; url: string; type: string }>;
  },
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("lessons")
    .update(data)
    .eq("id", lessonId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");

  // Notifier les users du role cible
  try {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("course_id")
      .eq("id", lessonId)
      .single();
    if (lesson?.course_id) {
      const { data: course } = await supabase
        .from("courses")
        .select("target_roles")
        .eq("id", lesson.course_id)
        .single();
      const targetRoles = course?.target_roles || [
        "admin",
        "manager",
        "setter",
        "closer",
      ];
      const { data: targetUsers } = await supabase
        .from("profiles")
        .select("id")
        .in("role", targetRoles);
      for (const u of (targetUsers || []).slice(0, 50)) {
        await notify(
          u.id,
          "Nouveau contenu disponible",
          `"${data.title || "Une leçon"}" a été modifié dans l'Academy`,
          {
            link: "/academy",
            type: "content_update",
          },
        );
      }
    }
  } catch {
    /* ignore notification errors */
  }
}

export async function deleteLesson(lessonId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function reorderLessons(
  moduleId: string,
  orderedLessonIds: string[],
) {
  const { supabase } = await requireAdmin();

  for (let i = 0; i < orderedLessonIds.length; i++) {
    await supabase
      .from("lessons")
      .update({ position: i })
      .eq("id", orderedLessonIds[i]);
  }

  revalidatePath("/academy", "page");
}

export async function addLessonAttachment(
  lessonId: string,
  attachment: {
    name: string;
    url: string;
    type: string;
  },
) {
  const { supabase } = await requireAdmin();

  // Get current attachments
  const { data: lesson } = await supabase
    .from("lessons")
    .select("attachments")
    .eq("id", lessonId)
    .single();

  const attachments = Array.isArray(lesson?.attachments)
    ? lesson.attachments
    : [];
  attachments.push(attachment);

  const { error } = await supabase
    .from("lessons")
    .update({ attachments })
    .eq("id", lessonId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function removeLessonAttachment(
  lessonId: string,
  attachmentUrl: string,
) {
  const { supabase } = await requireAdmin();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("attachments")
    .eq("id", lessonId)
    .single();

  const attachments = Array.isArray(lesson?.attachments)
    ? (
        lesson.attachments as Array<{ name: string; url: string; type: string }>
      ).filter((a) => a.url !== attachmentUrl)
    : [];

  const { error } = await supabase
    .from("lessons")
    .update({ attachments })
    .eq("id", lessonId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

// ─── Quiz CRUD ───────────────────────────────────────────────

export async function getQuizForLesson(lessonId: string) {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("quizzes")
    .select("*")
    .eq("lesson_id", lessonId)
    .single();

  return data;
}

export async function createQuiz(data: {
  lesson_id: string;
  questions: Array<{
    question: string;
    options: string[];
    correct_index: number;
  }>;
  max_attempts_per_day?: number;
  passing_score?: number;
  randomize?: boolean;
}) {
  const { supabase } = await requireAdmin();

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .insert({
      lesson_id: data.lesson_id,
      questions: data.questions,
      max_attempts_per_day: data.max_attempts_per_day ?? 3,
      passing_score: data.passing_score ?? 90,
      randomize: data.randomize ?? true,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
  return quiz;
}

export async function updateQuiz(
  quizId: string,
  data: {
    questions?: Array<{
      question: string;
      options: string[];
      correct_index: number;
    }>;
    max_attempts_per_day?: number;
    passing_score?: number;
    randomize?: boolean;
  },
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("quizzes")
    .update(data)
    .eq("id", quizId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function deleteQuiz(quizId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

// ─── Admin: Progression des setters ──────────────────────────

/**
 * Returns a table of all setters/closers with their Academy progress:
 * name, current module, overall %, best quiz score, last activity date.
 */
export async function getSetterProgressTable(): Promise<
  Array<{
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
    currentModule: string | null;
    progressPercent: number;
    bestQuizScore: number | null;
    lastActivity: string | null;
    completedLessons: number;
    totalLessons: number;
  }>
> {
  const { supabase } = await requireAdmin();

  // Get all setters/closers
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .in("role", ["setter", "closer"])
    .order("full_name");

  if (!profiles || profiles.length === 0) return [];

  // Get all published courses with modules and lessons
  const { data: courses } = await supabase
    .from("courses")
    .select(
      "id, modules:course_modules(id, title, position, lessons:lessons(id, position))",
    )
    .eq("is_published", true)
    .order("position");

  // Count total lessons
  let totalLessons = 0;
  const moduleByLessonId: Record<string, string> = {};
  const modulePositions: Record<string, number> = {};
  const moduleTitles: Record<string, string> = {};

  for (const c of courses || []) {
    const mods = Array.isArray(c.modules) ? c.modules : [];
    for (const m of mods as Array<{
      id: string;
      title: string;
      position: number;
      lessons: Array<{ id: string; position: number }>;
    }>) {
      moduleTitles[m.id] = m.title;
      modulePositions[m.id] = m.position;
      for (const l of m.lessons) {
        totalLessons++;
        moduleByLessonId[l.id] = m.id;
      }
    }
  }

  // Get all lesson progress for these users
  const userIds = profiles.map((p) => p.id);
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("user_id, lesson_id, completed, completed_at, quiz_score")
    .in("user_id", userIds)
    .eq("completed", true);

  // Get quiz attempts for best scores
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("user_id, score, attempted_at")
    .in("user_id", userIds)
    .order("attempted_at", { ascending: false });

  // Group data by user
  const progressByUser: Record<
    string,
    {
      completedLessons: Set<string>;
      lastActivity: string | null;
      bestScore: number | null;
      latestModuleId: string | null;
    }
  > = {};

  for (const p of progress || []) {
    if (!progressByUser[p.user_id]) {
      progressByUser[p.user_id] = {
        completedLessons: new Set(),
        lastActivity: null,
        bestScore: null,
        latestModuleId: null,
      };
    }
    const u = progressByUser[p.user_id];
    u.completedLessons.add(p.lesson_id);

    if (
      p.completed_at &&
      (!u.lastActivity || p.completed_at > u.lastActivity)
    ) {
      u.lastActivity = p.completed_at;
      u.latestModuleId = moduleByLessonId[p.lesson_id] || null;
    }

    if (
      p.quiz_score !== null &&
      (u.bestScore === null || p.quiz_score > u.bestScore)
    ) {
      u.bestScore = p.quiz_score;
    }
  }

  // Also check quiz_attempts for best scores & last activity
  for (const a of attempts || []) {
    if (!progressByUser[a.user_id]) {
      progressByUser[a.user_id] = {
        completedLessons: new Set(),
        lastActivity: null,
        bestScore: null,
        latestModuleId: null,
      };
    }
    const u = progressByUser[a.user_id];
    if (u.bestScore === null || a.score > u.bestScore) {
      u.bestScore = a.score;
    }
    if (
      a.attempted_at &&
      (!u.lastActivity || a.attempted_at > u.lastActivity)
    ) {
      u.lastActivity = a.attempted_at;
    }
  }

  return profiles.map((p) => {
    const u = progressByUser[p.id];
    const completed = u?.completedLessons.size || 0;
    const pct =
      totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    const currentModuleTitle = u?.latestModuleId
      ? moduleTitles[u.latestModuleId] || null
      : null;

    return {
      userId: p.id,
      fullName: p.full_name || "Utilisateur",
      avatarUrl: p.avatar_url,
      role: p.role,
      currentModule: currentModuleTitle,
      progressPercent: pct,
      bestQuizScore: u?.bestScore ?? null,
      lastActivity: u?.lastActivity ?? null,
      completedLessons: completed,
      totalLessons,
    };
  });
}

// ─── Auto-generation de flashcards depuis le contenu d'une lecon ──────

/**
 * Genere des flashcards (question/reponse) a partir du contenu texte
 * d'une lecon. Extraction basique : chaque section/paragraphe significatif
 * devient une flashcard.
 */
export async function generateFlashcardsFromLesson(lessonId: string) {
  const { supabase } = await requireAdmin();

  // Recuperer la lecon avec son contenu
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, title, description, content_html")
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) throw new Error("Lecon introuvable");

  // Extraire le texte brut du contenu HTML + description
  const rawParts: string[] = [];

  if (lesson.description) {
    rawParts.push(lesson.description);
  }

  if (lesson.content_html) {
    // Retirer les balises HTML pour ne garder que le texte
    const textContent = (lesson.content_html as string)
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|h[1-6]|li|ul|ol|blockquote)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    rawParts.push(textContent);
  }

  const fullText = rawParts.join("\n");

  if (!fullText.trim()) {
    throw new Error(
      "Aucun contenu textuel dans cette lecon pour generer des flashcards",
    );
  }

  // Decouper en sections/paragraphes significatifs
  const paragraphs = fullText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30); // Ignorer les paragraphes trop courts

  if (paragraphs.length === 0) {
    throw new Error(
      "Le contenu de la lecon est trop court pour generer des flashcards",
    );
  }

  // Generer les flashcards : le titre de la lecon + index comme question,
  // le paragraphe comme reponse
  const flashcards = paragraphs.slice(0, 20).map((paragraph, index) => {
    // Extraire la premiere phrase comme question potentielle
    const firstSentence = paragraph.split(/[.!?]/)[0]?.trim();
    const question =
      firstSentence && firstSentence.length > 15
        ? `Qu'est-ce que : "${firstSentence}" ?`
        : `${lesson.title} — Point cle ${index + 1} : De quoi s'agit-il ?`;

    return {
      lesson_id: lessonId,
      question,
      answer:
        paragraph.length > 500 ? paragraph.slice(0, 500) + "..." : paragraph,
      category: lesson.title,
    };
  });

  // Inserer les flashcards
  const { error: insertError } = await supabase
    .from("revision_cards")
    .insert(flashcards);

  if (insertError) throw new Error(insertError.message);

  revalidatePath("/academy/revision", "page");
  revalidatePath("/academy", "page");

  return flashcards.length;
}
