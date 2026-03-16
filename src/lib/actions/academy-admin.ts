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
