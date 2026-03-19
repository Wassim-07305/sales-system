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

// ─── Seed des modules de Damien ──────────────────────────────────────

const DAMIEN_COURSE_TITLE = "Formation Setting — S Academy";

interface ModuleSeed {
  title: string;
  description: string;
  lessons: string[];
  hasQuiz: boolean;
}

const DAMIEN_MODULES: ModuleSeed[] = [
  {
    title: "Module 0 — Introduction au setting",
    description:
      "Découvrez les bases du métier de setter et les fondamentaux de la prospection commerciale.",
    lessons: [
      "C'est quoi un setter",
      "Les deux types de prospection (B2C et B2B)",
      "Travailler avec un entrepreneur",
      "Les SOPs : c'est quoi et pourquoi",
      "Les qualités d'un bon setter",
    ],
    hasQuiz: false,
  },
  {
    title: "Module 1-2 — Fondamentaux du setting",
    description:
      "Maîtrisez les fondamentaux : anatomie d'une conversation, accroche, qualification, valeur et relance.",
    lessons: [
      "Anatomie d'une conversation",
      "L'accroche parfaite",
      "La qualification",
      "Apporter de la valeur",
      "La prise de rendez-vous",
      "La relance efficace",
    ],
    hasQuiz: true,
  },
  {
    title: "Module 3-4 — Setting B2C",
    description:
      "Techniques de setting B2C : inbound, qualification, valeur, CTA et relance spécifiques au B2C.",
    lessons: [
      "Introduction au B2C",
      "L'inbound : les points de contact",
      "Inbound avancé",
      "La qualification B2C",
      "Apporter de la valeur en B2C",
      "Le CTA",
      "La relance B2C",
      "Exemples et cas concrets réels",
    ],
    hasQuiz: true,
  },
  {
    title: "Module 5-6 — Setting B2B actif",
    description:
      "Prospection B2B active : sourcing, outbound, inbound et relance dans un contexte professionnel.",
    lessons: [
      "Introduction au B2B actif",
      "Le sourcing de prospects",
      "L'outbound : prendre contact",
      "L'inbound B2B",
      "La relance B2B",
      "Exemples et cas concrets réels",
    ],
    hasQuiz: true,
  },
  {
    title: "Module 7 — Setting B2B passif",
    description:
      "Stratégies de prospection B2B passive : sourcing et outbound passif.",
    lessons: [
      "Introduction au B2B passif",
      "Le sourcing passif",
      "L'outbound passif",
      "Exemples et cas concrets réels",
    ],
    hasQuiz: true,
  },
  {
    title: "Module 8 — Setting téléphonique",
    description:
      "Maîtrisez l'art du setting par téléphone : préparation, structure, objections et prise de RDV.",
    lessons: [
      "Pourquoi le téléphone",
      "La préparation de l'appel",
      "La structure de l'appel téléphonique",
      "Les objections téléphoniques",
      "La prise de RDV par téléphone",
    ],
    hasQuiz: true,
  },
  {
    title: "Module 9 — Bonus",
    description:
      "Contenus bonus : ManyChat (Minichat) et le champ lexical du business en ligne.",
    lessons: [
      "Comment utiliser ManyChat (Minichat)",
      "Le champ lexical du business en ligne : les mots clés indispensables",
    ],
    hasQuiz: false,
  },
  {
    title: "Module 10 — Maîtriser les outils",
    description:
      "Apprenez à utiliser les SOPs, le CRM et à organiser votre journée de setter.",
    lessons: [
      "Comprendre et utiliser les SOPs",
      "Maîtriser le CRM",
      "Organiser sa journée de setter",
    ],
    hasQuiz: true,
  },
  {
    title: "Module 11 — Décrocher ses missions",
    description:
      "De la micro-entreprise au positionnement sur le marché : décrochez vos premières missions.",
    lessons: [
      "Créer sa micro-entreprise",
      "Créer son site ou carré professionnel",
      "Se positionner sur le marché",
    ],
    hasQuiz: true,
  },
  {
    title: "Module 12 — Rediffusion des appels de groupe",
    description:
      "Retrouvez ici les replays de tous les appels de groupe. Mis à jour après chaque session.",
    lessons: [],
    hasQuiz: false,
  },
];

const QUIZ_MODULE_1_2 = [
  {
    question: "Quel est le rôle principal d'un setter ?",
    options: [
      "Conclure la vente (closing)",
      "Qualifier le prospect et décrocher un rendez-vous",
      "Gérer le SAV des clients",
      "Créer le contenu marketing",
    ],
    correct_index: 1,
  },
  {
    question:
      "Quelle est la première étape dans l'anatomie d'une conversation de setting ?",
    options: [
      "Proposer le rendez-vous directement",
      "Envoyer un message d'accroche personnalisé",
      "Demander le numéro de téléphone",
      "Présenter l'offre du client",
    ],
    correct_index: 1,
  },
  {
    question: "Quel est l'objectif de la phase de qualification ?",
    options: [
      "Vendre le produit immédiatement",
      "Déterminer si le prospect correspond au profil idéal",
      "Obtenir l'email du prospect",
      "Faire un audit gratuit du business",
    ],
    correct_index: 1,
  },
  {
    question: "Qu'est-ce qu'une bonne accroche doit provoquer chez le prospect ?",
    options: [
      "L'urgence d'acheter maintenant",
      "La curiosité et l'envie de répondre",
      "La peur de rater une opportunité",
      "L'admiration pour votre profil",
    ],
    correct_index: 1,
  },
  {
    question:
      "Quand est-il recommandé d'apporter de la valeur dans la conversation ?",
    options: [
      "Uniquement après le rendez-vous",
      "Jamais, il faut rester mystérieux",
      "Pendant la conversation, avant de proposer le RDV",
      "Seulement si le prospect le demande",
    ],
    correct_index: 2,
  },
  {
    question: "Quel est le timing idéal pour une première relance ?",
    options: [
      "1 heure après le premier message",
      "24 à 48 heures après le dernier message",
      "1 semaine plus tard",
      "Il ne faut jamais relancer",
    ],
    correct_index: 1,
  },
  {
    question: "Quelle est la meilleure approche pour la prise de rendez-vous ?",
    options: [
      "Envoyer un lien Calendly sans explication",
      "Proposer une date et heure précise après avoir qualifié",
      "Attendre que le prospect demande un RDV",
      "Forcer le prospect à s'engager immédiatement",
    ],
    correct_index: 1,
  },
  {
    question:
      "Quelle est la différence fondamentale entre la prospection B2C et B2B ?",
    options: [
      "Il n'y a aucune différence",
      "Le B2B cible des entreprises, le B2C cible des particuliers",
      "Le B2B est plus facile que le B2C",
      "Le B2C se fait uniquement par téléphone",
    ],
    correct_index: 1,
  },
  {
    question: "Pourquoi un setter doit-il connaître les SOPs ?",
    options: [
      "Pour impressionner l'entrepreneur",
      "Pour suivre un processus standardisé et cohérent avec chaque prospect",
      "Pour remplacer le closer en cas d'absence",
      "Les SOPs ne sont pas utiles pour un setter",
    ],
    correct_index: 1,
  },
  {
    question:
      "Quelle qualité est la plus importante pour réussir en tant que setter ?",
    options: [
      "Avoir un diplôme en marketing",
      "La régularité et la discipline dans le volume de messages",
      "Connaître tous les outils CRM du marché",
      "Avoir déjà travaillé dans la vente physique",
    ],
    correct_index: 1,
  },
];

/**
 * Seeds the 10+ modules of Damien's Setting Academy.
 * Idempotent: checks if the course already exists by title.
 * Returns { created: true } on success, { created: false, reason } if already exists.
 */
export async function seedDamienModules(): Promise<{
  created: boolean;
  reason?: string;
  courseId?: string;
}> {
  const { supabase } = await requireAdmin();

  // Check if already seeded
  const { data: existing } = await supabase
    .from("courses")
    .select("id")
    .eq("title", DAMIEN_COURSE_TITLE)
    .maybeSingle();

  if (existing) {
    return {
      created: false,
      reason: "La formation existe déjà.",
      courseId: existing.id,
    };
  }

  // Get max position for courses
  const { data: lastCourse } = await supabase
    .from("courses")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const coursePosition = (lastCourse?.position ?? -1) + 1;

  // Create the course
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      title: DAMIEN_COURSE_TITLE,
      description:
        "La formation complète pour devenir setter professionnel. 13 modules progressifs du débutant à l'expert, couvrant B2C, B2B, téléphone, outils et missions.",
      is_published: true,
      position: coursePosition,
      target_roles: ["setter", "closer", "client_b2c"],
      has_prerequisites: false,
    })
    .select("id")
    .single();

  if (courseError || !course) {
    throw new Error(courseError?.message || "Erreur création du cours");
  }

  // Create modules and lessons
  for (let mi = 0; mi < DAMIEN_MODULES.length; mi++) {
    const mod = DAMIEN_MODULES[mi];

    const { data: moduleRow, error: modError } = await supabase
      .from("course_modules")
      .insert({
        course_id: course.id,
        title: mod.title,
        description: mod.description,
        position: mi,
      })
      .select("id")
      .single();

    if (modError || !moduleRow) {
      throw new Error(modError?.message || `Erreur module ${mi}`);
    }

    // Create lessons for this module
    for (let li = 0; li < mod.lessons.length; li++) {
      const { data: lessonRow, error: lessonError } = await supabase
        .from("lessons")
        .insert({
          course_id: course.id,
          module_id: moduleRow.id,
          title: mod.lessons[li],
          position: li,
          attachments: [],
        })
        .select("id")
        .single();

      if (lessonError || !lessonRow) {
        throw new Error(lessonError?.message || `Erreur leçon ${li}`);
      }

      // Add quiz for module 1-2 (index 1) on the last lesson
      if (mi === 1 && li === mod.lessons.length - 1) {
        const { error: quizError } = await supabase.from("quizzes").insert({
          lesson_id: lessonRow.id,
          questions: QUIZ_MODULE_1_2,
          max_attempts_per_day: 3,
          passing_score: 90,
          randomize: true,
        });

        if (quizError) {
          console.error("Quiz insert error:", quizError.message);
        }
      }
    }
  }

  revalidatePath("/academy", "page");
  revalidatePath("/academy/admin", "page");

  return { created: true, courseId: course.id };
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
