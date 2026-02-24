"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getRoleplayProfiles() {
  const supabase = await createClient();
  const { data } = await supabase.from("roleplay_prospect_profiles").select("*").order("name");
  return data || [];
}

export async function createRoleplayProfile(profile: {
  name: string;
  niche: string;
  persona: string;
  difficulty: string;
  objections: string[];
  scenario: string;
  network: string;
}) {
  const supabase = await createClient();
  await supabase.from("roleplay_prospect_profiles").insert(profile);
  revalidatePath("/roleplay");
}

export async function deleteRoleplayProfile(id: string) {
  const supabase = await createClient();
  await supabase.from("roleplay_prospect_profiles").delete().eq("id", id);
  revalidatePath("/roleplay");
}

export async function startSession(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase.from("roleplay_sessions").insert({
    user_id: user.id,
    prospect_profile_id: profileId,
    status: "active",
    conversation: [],
    started_at: new Date().toISOString(),
  }).select().single();

  return data;
}

export async function sendRoleplayMessage(sessionId: string, content: string) {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("roleplay_sessions")
    .select("conversation")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session non trouvée");

  const messages = Array.isArray(session.conversation) ? session.conversation : [];
  messages.push({ role: "user", content, timestamp: new Date().toISOString() });

  const aiResponses = [
    "Hmm, intéressant. Mais je ne suis pas sûr que ce soit fait pour moi. Pourquoi devrais-je vous faire confiance ?",
    "Je comprends, mais j'ai déjà essayé plusieurs formations sans résultat. Qu'est-ce qui rend la vôtre différente ?",
    "Le prix me semble élevé. Est-ce qu'il y a des facilités de paiement ?",
    "Je dois en parler avec mon associé. Vous pouvez me rappeler la semaine prochaine ?",
    "Ok, ça m'intéresse. Comment on procède pour la suite ?",
    "Non merci, je ne suis vraiment pas intéressé pour le moment.",
    "Pouvez-vous m'envoyer plus d'informations par email ?",
    "Quels résultats ont obtenu vos anciens clients ?",
  ];
  const aiMessage = aiResponses[Math.floor(Math.random() * aiResponses.length)];
  messages.push({ role: "assistant", content: aiMessage, timestamp: new Date().toISOString() });

  await supabase.from("roleplay_sessions").update({ conversation: messages }).eq("id", sessionId);
  return { aiMessage };
}

export async function endSession(sessionId: string) {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("roleplay_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session non trouvée");

  const score = Math.floor(Math.random() * 40) + 60;
  const feedback = {
    score,
    strengths: ["Bonne introduction", "Questions pertinentes"],
    improvements: ["Gestion des objections à améliorer", "Closing trop rapide"],
    objection_handling: Math.floor(Math.random() * 30) + 60,
    rapport_building: Math.floor(Math.random() * 30) + 65,
    closing_technique: Math.floor(Math.random() * 30) + 55,
  };

  await supabase.from("roleplay_sessions").update({
    status: "completed",
    ended_at: new Date().toISOString(),
    score,
    ai_feedback: feedback,
    duration_seconds: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000),
  }).eq("id", sessionId);

  revalidatePath("/roleplay");
  return feedback;
}

export async function getUserSessions(userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("roleplay_sessions")
    .select("*, profile:roleplay_prospect_profiles(name, niche, difficulty), user:profiles(full_name, avatar_url)")
    .order("started_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data } = await query;
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    profile: Array.isArray(d.profile) ? d.profile[0] : d.profile,
    user: Array.isArray(d.user) ? d.user[0] : d.user,
  }));
}

export async function getSession(sessionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roleplay_sessions")
    .select("*, profile:roleplay_prospect_profiles(*), user:profiles(full_name)")
    .eq("id", sessionId)
    .single();

  if (!data) return null;
  return {
    ...data,
    profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
    user: Array.isArray(data.user) ? data.user[0] : data.user,
  };
}
