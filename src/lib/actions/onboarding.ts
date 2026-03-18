"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiComplete, aiJSON } from "@/lib/ai/client";
import { notify, notifyMany } from "@/lib/actions/notifications";

export async function completeOnboardingStep(
  stepId: string,
  responseData?: Record<string, unknown>,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase.from("client_onboarding").upsert(
    {
      client_id: user.id,
      step_id: stepId,
      completed: true,
      completed_at: new Date().toISOString(),
      response_data: responseData || {},
    },
    { onConflict: "client_id,step_id" },
  );

  // Check if all required steps are completed
  const { data: allSteps } = await supabase
    .from("onboarding_steps")
    .select("id")
    .eq("is_required", true);

  const { data: completedSteps } = await supabase
    .from("client_onboarding")
    .select("step_id")
    .eq("client_id", user.id)
    .eq("completed", true);

  const completedIds = new Set((completedSteps || []).map((s) => s.step_id));
  const allCompleted = (allSteps || []).every((s) => completedIds.has(s.id));

  if (allCompleted) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
  }

  // Update onboarding_step counter — completedSteps already includes the newly upserted step
  const completedCount = completedSteps?.length || 0;
  await supabase
    .from("profiles")
    .update({
      onboarding_step: completedCount,
    })
    .eq("id", user.id);

  revalidatePath("/onboarding");
}

export async function saveOnboardingStep(step: {
  id?: string;
  title: string;
  description: string;
  position: number;
  step_type: string;
  content: Record<string, unknown>;
  is_required: boolean;
}) {
  const supabase = await createClient();

  if (step.id) {
    await supabase
      .from("onboarding_steps")
      .update({
        title: step.title,
        description: step.description,
        position: step.position,
        step_type: step.step_type,
        content: step.content,
        is_required: step.is_required,
      })
      .eq("id", step.id);
  } else {
    await supabase.from("onboarding_steps").insert({
      title: step.title,
      description: step.description,
      position: step.position,
      step_type: step.step_type,
      content: step.content,
      is_required: step.is_required,
    });
  }

  revalidatePath("/onboarding");
  revalidatePath("/settings/onboarding");
}

export async function deleteOnboardingStep(stepId: string) {
  const supabase = await createClient();
  await supabase.from("onboarding_steps").delete().eq("id", stepId);
  revalidatePath("/settings/onboarding");
}

// --- F4: Welcome Video Personnalisée ---

export async function getWelcomeVideo(role?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const userRole = role || "client_b2c";

  // Try to fetch from welcome_videos table (graceful fallback if not exists)
  try {
    const { data, error } = await supabase
      .from("welcome_videos")
      .select("video_url, title, description")
      .eq("role", userRole)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        videoUrl: data.video_url as string,
        title: (data.title as string) || "Ta vidéo de bienvenue",
        description: (data.description as string) || null,
      };
    }
  } catch {
    // Table doesn't exist — fall through to fallback
  }

  // Fallback: try onboarding_content table
  try {
    const { data, error } = await supabase
      .from("onboarding_content")
      .select("content_url, title, description")
      .eq("role", userRole)
      .eq("type", "welcome_video")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        videoUrl: data.content_url as string,
        title: (data.title as string) || "Ta vidéo de bienvenue",
        description: (data.description as string) || null,
      };
    }
  } catch {
    // Table doesn't exist — fall through to null
  }

  // No video configured — component will show fallback card
  return null;
}

// --- Batch 1B: Enhanced Onboarding ---

export async function submitOnboardingQuiz(answers: Record<string, string>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Calculate score based on answers
  const score = calculateQuizScore(answers);
  const colorCode = score >= 80 ? "green" : score >= 50 ? "orange" : "red";

  await supabase.from("onboarding_quiz_responses").insert({
    user_id: user.id,
    answers,
    score,
    color_code: colorCode,
  });

  // Update profile with quiz results
  await supabase
    .from("profiles")
    .update({ onboarding_step: 1 })
    .eq("id", user.id);

  revalidatePath("/onboarding");
  return { score, colorCode };
}

function calculateQuizScore(answers: Record<string, string>): number {
  // Scoring logic based on answer quality
  let score = 0;
  const keys = Object.keys(answers);
  for (const key of keys) {
    const answer = answers[key];
    if (answer && answer.length > 20) score += 15;
    else if (answer && answer.length > 5) score += 10;
    else if (answer) score += 5;
  }
  return Math.min(100, Math.round((score / (keys.length * 15)) * 100));
}

export async function getWelcomePack(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, company")
    .eq("id", userId)
    .single();

  const role = profile?.role || "client_b2c";

  // Get welcome pack for this role
  const { data: pack } = await supabase
    .from("welcome_packs")
    .select("*")
    .eq("role", role)
    .eq("is_active", true)
    .maybeSingle();

  // Get quiz results for personalization
  const { data: quizResult } = await supabase
    .from("onboarding_quiz_responses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    profile,
    pack,
    quizResult,
    personalizedTips: await generatePersonalizedTips(
      role,
      quizResult?.color_code || "orange",
    ),
  };
}

async function generatePersonalizedTips(
  role: string,
  colorCode: string,
): Promise<string[]> {
  try {
    const result = await aiJSON<{ tips: string[] }>(
      `Génère 4 conseils personnalisés pour un nouvel utilisateur de S Academy.

Profil :
- Rôle : ${role === "client_b2c" ? "Setter en formation (B2C)" : role === "client_b2b" ? "Entrepreneur (B2B)" : role}
- Niveau détecté (code couleur quiz) : ${colorCode === "green" ? "Avancé (🟢)" : colorCode === "orange" ? "Intermédiaire (🟡)" : "Débutant (🔴)"}

Réponds en JSON : { "tips": ["conseil 1", "conseil 2", "conseil 3", "conseil 4"] }

Les conseils doivent être :
- Concrets et actionnables (pas de généralités)
- Adaptés au niveau du profil
- Orientés vers les premières actions à faire sur la plateforme
- En français, tutoiement`,
      {
        system:
          "Tu es le coach de S Academy, une plateforme de formation au setting/vente.",
      },
    );
    return result.tips;
  } catch {
    const fallback: Record<string, string[]> = {
      green: [
        "Excellent profil ! Tu es prêt à démarrer la prospection active.",
        "Commence par personnaliser tes scripts dans l'onglet Scripts.",
        "Planifie tes 3 premières sessions de jeu de rôles.",
        "Rejoins le prochain call de groupe pour te présenter.",
      ],
      orange: [
        "Bon potentiel ! Complète les modules de formation prioritaires.",
        "Concentre-toi sur la maîtrise des objections.",
        "Participe aux calls de groupe pour progresser plus vite.",
        "Fais au moins 1 session de roleplay IA par jour.",
      ],
      red: [
        "Bienvenue ! Commence par les bases du setting.",
        "Regarde toutes les vidéos d'onboarding attentivement.",
        "N'hésite pas à poser tes questions dans la communauté.",
        "Fixe-toi un objectif : terminer le module 1 cette semaine.",
      ],
    };
    return fallback[colorCode] || fallback.orange;
  }
}

/**
 * Auto-book the first onboarding call for a new client.
 * Finds the next available slot and creates a confirmed booking.
 */
export async function triggerAutoBooking(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  if (!profile) return { success: false, message: "Profil non trouve" };

  // Check if already has an onboarding booking
  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("user_id", userId)
    .eq("slot_type", "onboarding")
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      success: true,
      message: "Un appel d'onboarding est deja programme",
      bookingId: existing[0].id,
    };
  }

  // Find available booking slots in the next 7 days
  const now = new Date();
  const { data: slots } = await supabase
    .from("booking_slots")
    .select("day_of_week, start_time")
    .eq("is_available", true)
    .order("day_of_week")
    .limit(5);

  let targetDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  if (slots && slots.length > 0) {
    const slot = slots[0];
    const targetDay = slot.day_of_week;
    targetDate = new Date(now);
    while (targetDate.getDay() !== targetDay || targetDate <= now) {
      targetDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    }
    const [h, m] = (slot.start_time || "10:00").split(":").map(Number);
    targetDate.setHours(h, m, 0, 0);
  } else {
    targetDate.setHours(10, 0, 0, 0);
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: userId,
      prospect_name: profile.full_name || profile.email,
      scheduled_at: targetDate.toISOString(),
      slot_type: "onboarding",
      status: "confirmed",
      notes: "Appel d'onboarding automatique",
    })
    .select("id")
    .single();

  if (error) return { success: false, message: error.message };

  // Notify user
  await notify(
    userId,
    "Appel d'onboarding programme !",
    `Ton premier appel est prevu le ${targetDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} a ${targetDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
    { type: "onboarding_call", link: "/bookings" },
  );

  // Notify admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"]);

  if (admins && admins.length > 0) {
    await notifyMany(
      admins.map((a) => a.id),
      "Nouvel appel d'onboarding",
      `${profile.full_name || "Nouveau client"} — appel programme le ${targetDate.toLocaleDateString("fr-FR")}.`,
      { type: "onboarding_call", link: "/bookings" },
    );
  }

  revalidatePath("/bookings");
  return {
    success: true,
    message: "Appel d'onboarding programme",
    bookingId: booking?.id,
  };
}

export async function scrapeAndGenerateScript(linkedinUrl: string) {
  // Note : le scraping réel de LinkedIn nécessite une API tierce (Proxycurl, PhantomBuster, etc.)
  // Pour l'instant, on génère un script basé sur l'URL fournie
  try {
    const script = await aiComplete(
      `Génère un script de premier message LinkedIn professionnel basé sur ce profil : ${linkedinUrl}

Le script doit :
- Commencer par une accroche personnalisée liée au profil
- Mentionner un point commun ou un intérêt pour leur activité
- Proposer un échange de valeur (pas de pitch direct)
- Se terminer par une question ouverte
- Être concis (3-5 phrases max)
- Utiliser le tutoiement

Écris uniquement le texte du message, sans guillemets.`,
      {
        system:
          "Tu es un expert en copywriting LinkedIn. Tu crées des messages d'approche qui génèrent des taux de réponse élevés. Ton ton est professionnel mais humain.",
        maxTokens: 512,
      },
    );

    return {
      success: true,
      script,
      profileData: {
        name: "Prospect LinkedIn",
        industry: "À déterminer après scraping",
        source: linkedinUrl,
      },
    };
  } catch {
    return {
      success: true,
      script:
        "Bonjour [Nom], j'ai vu votre profil et votre parcours m'a interpellé. Seriez-vous ouvert à un échange de 15 minutes cette semaine ?",
      profileData: { name: "Prospect", industry: "Non défini" },
    };
  }
}

// --- Feature #07: Checklist d'onboarding interactive gamifiée ---

export async function getOnboardingChecklist(userId: string) {
  const supabase = await createClient();

  const checklistItems = [
    {
      id: "checklist_profile",
      label: "Completer ton profil",
      link: "/profile",
      icon: "user",
    },
    {
      id: "checklist_module1",
      label: "Commencer le Module 1",
      link: "/academy",
      icon: "book",
    },
    {
      id: "checklist_roleplay",
      label: "Faire ta premiere session de roleplay",
      link: "/roleplay",
      icon: "target",
    },
    {
      id: "checklist_journal",
      label: "Remplir ton journal du jour",
      link: "/dashboard",
      icon: "edit",
    },
    {
      id: "checklist_booking",
      label: "Reserver ton appel d'onboarding",
      link: "/bookings",
      icon: "calendar",
    },
    {
      id: "checklist_community",
      label: "Te presenter dans la communaute",
      link: "/community/forum",
      icon: "users",
    },
  ];

  const { data: completed } = await supabase
    .from("client_onboarding")
    .select("step_id")
    .eq("client_id", userId)
    .eq("completed", true)
    .like("step_id", "checklist_%");

  const completedIds = new Set((completed || []).map((c) => c.step_id));

  return checklistItems.map((item) => ({
    ...item,
    completed: completedIds.has(item.id),
  }));
}

export async function toggleChecklistItem(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: existing } = await supabase
    .from("client_onboarding")
    .select("completed")
    .eq("client_id", user.id)
    .eq("step_id", itemId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("client_onboarding")
      .update({
        completed: !existing.completed,
        completed_at: new Date().toISOString(),
      })
      .eq("client_id", user.id)
      .eq("step_id", itemId);
  } else {
    await supabase.from("client_onboarding").insert({
      client_id: user.id,
      step_id: itemId,
      completed: true,
      completed_at: new Date().toISOString(),
      response_data: {},
    });
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
}

// --- Feature #10: Tunnel de double validation ---

export async function submitCommitments(commitments: {
  charter_accepted: boolean;
  objectives_confirmed: boolean;
  availability_confirmed: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  if (
    !commitments.charter_accepted ||
    !commitments.objectives_confirmed ||
    !commitments.availability_confirmed
  ) {
    throw new Error("Tous les engagements doivent etre valides");
  }

  await supabase.from("client_onboarding").upsert(
    {
      client_id: user.id,
      step_id: "double_validation",
      completed: true,
      completed_at: new Date().toISOString(),
      response_data: commitments,
    },
    { onConflict: "client_id,step_id" },
  );

  revalidatePath("/onboarding");
  return { success: true };
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifie" };

  const file = formData.get("file") as File;
  if (!file) return { error: "Aucun fichier" };
  if (file.size > 10 * 1024 * 1024)
    return { error: "Le fichier depasse 10 Mo" };

  const ext = file.name.split(".").pop() || "png";
  const path = `${user.id}/avatar.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, {
      upsert: true,
      contentType: file.type,
    });

  if (error) return { error: error.message };

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

  return { success: true, url: urlData.publicUrl };
}

export async function hasCompletedCommitments(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_onboarding")
    .select("completed")
    .eq("client_id", userId)
    .eq("step_id", "double_validation")
    .eq("completed", true)
    .maybeSingle();

  return !!data;
}

// --- Save onboarding step progress ---

export async function saveOnboardingProgress(stepNumber: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase
    .from("profiles")
    .update({ onboarding_step: stepNumber })
    .eq("id", user.id);

  return { success: true };
}

// --- Post welcome message in community ---

export async function postWelcomeCommunityMessage(userName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const content = `Salut à tous ! Je suis ${userName} et je viens de rejoindre la S Academy. Hâte de commencer cette aventure avec vous ! 🚀`;

  await supabase.from("community_posts").insert({
    author_id: user.id,
    type: "discussion",
    title: `${userName} rejoint la communauté !`,
    content,
    target_audience: "all",
    channel: "general",
    likes_count: 0,
  });

  revalidatePath("/community");
  return { success: true };
}

// --- Onboarding simple (B2C / B2B) ---

export async function completeSimpleOnboarding(data: {
  full_name?: string;
  phone?: string;
  company?: string;
  avatar_url?: string;
  bio?: string;
  skills?: string;
  business_description?: string;
  qualification_questions?: string;
  prospection_channels?: string[];
  linkedin_url?: string;
  instagram_username?: string;
  objectif_financier?: string;
  disponibilites_heures?: string;
  situation_actuelle?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Update profile
  await supabase
    .from("profiles")
    .update({
      full_name: data.full_name || null,
      phone: data.phone || null,
      company: data.company || null,
      avatar_url: data.avatar_url || null,
      niche: data.skills || data.business_description || null,
      onboarding_completed: true,
      onboarding_step: 99,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  // Save extended settings
  const settingsEntries = [
    { key: "bio", value: data.bio || "" },
    { key: "skills", value: data.skills || "" },
    { key: "business_description", value: data.business_description || "" },
    {
      key: "qualification_questions",
      value: data.qualification_questions || "",
    },
    {
      key: "prospection_channels",
      value: JSON.stringify(data.prospection_channels || []),
    },
    { key: "linkedin_url", value: data.linkedin_url || "" },
    { key: "instagram_username", value: data.instagram_username || "" },
    { key: "objectif_financier", value: data.objectif_financier || "" },
    { key: "disponibilites_heures", value: data.disponibilites_heures || "" },
    { key: "situation_actuelle", value: data.situation_actuelle || "" },
  ].filter((e) => e.value !== "" && e.value !== "[]");

  for (const entry of settingsEntries) {
    await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, key: entry.key, value: entry.value },
        { onConflict: "user_id,key" },
      );
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { success: true };
}

// ─── F5: Onboarding B2B Full Auto ───────────────────────────────────

export async function generateB2BWorkspace(data: {
  companyName: string;
  offer: string;
  targetAudience: string;
  price: string;
  networks: string[];
  communicationTone: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Generate SOP document
  const sop = {
    company: data.companyName,
    offer: data.offer,
    audience: data.targetAudience,
    price: data.price,
    networks: data.networks,
    tone: data.communicationTone,
    workflow: {
      step1: "Identifier les prospects sur " + data.networks.join(", "),
      step2: "Analyser le profil (bio, derniers posts, activité)",
      step3: `Premier message personnalisé — Ton : ${data.communicationTone}`,
      step4: "Si réponse positive → qualifier (besoin, budget, timing)",
      step5: "Si qualifié → proposer un appel découverte",
      step6: "Appel → présentation de l'offre " + data.offer,
      step7: "Follow-up J+1 si pas de réponse",
      step8: "Relance J+3 avec valeur ajoutée",
    },
    scriptTemplate: `Salut [PRÉNOM] ! J'ai vu que [ACCROCHE PERSONNALISÉE]. Chez ${data.companyName}, on aide [${data.targetAudience}] à [BÉNÉFICE PRINCIPAL]. Est-ce que tu aurais 15 min cette semaine pour en discuter ?`,
    objectionHandling: {
      "Pas le temps":
        "Je comprends, c'est justement pour ça qu'on propose un format court de 15 min. On peut trouver un créneau qui t'arrange ?",
      "Trop cher": `L'investissement de ${data.price} est rentabilisé dès le premier mois grâce à [RÉSULTAT CONCRET].`,
      "J'y réfléchis":
        "Bien sûr ! Qu'est-ce qui te ferait passer à l'action aujourd'hui ?",
    },
  };

  // Save SOP
  const { error: sopError } = await supabase.from("client_sops").upsert(
    {
      client_id: user.id,
      sop_data: sop,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );

  if (sopError) return { error: sopError.message };

  // Create default pipeline stages for this client
  const defaultStages = [
    { name: "Prospect identifié", color: "#6b7280", position: 0 },
    { name: "Premier contact", color: "#3b82f6", position: 1 },
    { name: "Conversation active", color: "#f59e0b", position: 2 },
    { name: "Appel découverte", color: "#8b5cf6", position: 3 },
    { name: "Proposition envoyée", color: "#f97316", position: 4 },
    { name: "Client signé", color: "#22c55e", position: 5 },
  ];

  for (const stage of defaultStages) {
    await supabase.from("pipeline_stages").insert({
      ...stage,
      team_id: user.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/crm");
  return { success: true, sop };
}

// --- Admin: liste des onboardings en cours ---

export async function getOnboardingUsers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "manager") return [];

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, onboarding_step, onboarding_completed, updated_at",
    )
    .eq("onboarding_completed", false)
    .order("updated_at", { ascending: false });

  return data || [];
}
