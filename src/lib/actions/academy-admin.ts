"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Helper: require admin or manager role
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    .select("*, modules:course_modules(id, title, position, lessons:lessons(id))")
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
      target_roles: data.target_roles || ["setter", "closer", "client_b2b", "client_b2c"],
      is_published: data.is_published ?? false,
      position,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
  return course?.id;
}

export async function updateCourse(courseId: string, data: {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  target_roles?: string[];
  is_published?: boolean;
}) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("courses")
    .update(data)
    .eq("id", courseId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function deleteCourse(courseId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

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

export async function updateModule(moduleId: string, data: {
  title?: string;
  description?: string;
}) {
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

export async function reorderModules(courseId: string, orderedModuleIds: string[]) {
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
  return lesson?.id;
}

export async function updateLesson(lessonId: string, data: {
  title?: string;
  description?: string;
  video_url?: string | null;
  duration_minutes?: number | null;
  content_html?: string | null;
  attachments?: Array<{ name: string; url: string; type: string }>;
}) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("lessons")
    .update(data)
    .eq("id", lessonId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function deleteLesson(lessonId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function reorderLessons(moduleId: string, orderedLessonIds: string[]) {
  const { supabase } = await requireAdmin();

  for (let i = 0; i < orderedLessonIds.length; i++) {
    await supabase
      .from("lessons")
      .update({ position: i })
      .eq("id", orderedLessonIds[i]);
  }

  revalidatePath("/academy", "page");
}

export async function addLessonAttachment(lessonId: string, attachment: {
  name: string;
  url: string;
  type: string;
}) {
  const { supabase } = await requireAdmin();

  // Get current attachments
  const { data: lesson } = await supabase
    .from("lessons")
    .select("attachments")
    .eq("id", lessonId)
    .single();

  const attachments = Array.isArray(lesson?.attachments) ? lesson.attachments : [];
  attachments.push(attachment);

  const { error } = await supabase
    .from("lessons")
    .update({ attachments })
    .eq("id", lessonId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}

export async function removeLessonAttachment(lessonId: string, attachmentUrl: string) {
  const { supabase } = await requireAdmin();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("attachments")
    .eq("id", lessonId)
    .single();

  const attachments = Array.isArray(lesson?.attachments)
    ? (lesson.attachments as Array<{ name: string; url: string; type: string }>).filter((a) => a.url !== attachmentUrl)
    : [];

  const { error } = await supabase
    .from("lessons")
    .update({ attachments })
    .eq("id", lessonId);

  if (error) throw new Error(error.message);
  revalidatePath("/academy", "page");
}
