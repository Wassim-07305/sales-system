"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiComplete, aiJSON } from "@/lib/ai/client";

// Modèle gratuit OpenRouter pour GenSpark
const GENSPARK_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
import type {
  SlideLayout,
  SlideTransition,
  PresentationTheme,
  SlideContent,
} from "@/lib/types/database";

// ---------------------
// CRUD Presentations
// ---------------------

export async function getPresentations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Presentations personnelles
  const { data: ownPresentations } = await supabase
    .from("presentations")
    .select("*, presentation_slides(id)")
    .eq("created_by", user.id)
    .eq("is_template", false)
    .order("updated_at", { ascending: false });

  // Presentations partagees avec l'utilisateur
  const { data: shares } = await supabase
    .from("presentation_shares")
    .select("presentation_id, permission")
    .eq("shared_with", user.id);

  let sharedPresentations: typeof ownPresentations = [];
  if (shares && shares.length > 0) {
    const sharedIds = shares.map((s) => s.presentation_id);
    const { data } = await supabase
      .from("presentations")
      .select("*, presentation_slides(id)")
      .in("id", sharedIds)
      .order("updated_at", { ascending: false });
    sharedPresentations = data || [];
  }

  // Fusionner en evitant les doublons
  const ownIds = new Set((ownPresentations || []).map((p) => p.id));
  const merged = [
    ...(ownPresentations || []),
    ...(sharedPresentations || []).filter((p) => !ownIds.has(p.id)),
  ];

  // Transformer pour inclure le slides count
  return merged.map((p) => ({
    ...p,
    slide_count: Array.isArray(p.presentation_slides)
      ? p.presentation_slides.length
      : 0,
    presentation_slides: undefined,
  }));
}

export async function getPresentation(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: presentation } = await supabase
    .from("presentations")
    .select("*")
    .eq("id", id)
    .single();

  if (!presentation) throw new Error("Présentation introuvable");

  const { data: slides } = await supabase
    .from("presentation_slides")
    .select("*")
    .eq("presentation_id", id)
    .order("position", { ascending: true });

  return { presentation, slides: slides || [] };
}

export async function createPresentation(data: {
  title: string;
  theme?: PresentationTheme;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: presentation, error } = await supabase
    .from("presentations")
    .insert({
      title: data.title,
      theme: data.theme || "dark",
      created_by: user.id,
      is_template: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Creer le slide titre par defaut
  const defaultContent: SlideContent = {
    title: "Sans titre",
    subtitle: "Sous-titre",
  };

  await supabase.from("presentation_slides").insert({
    presentation_id: presentation.id,
    position: 0,
    layout: "title" as SlideLayout,
    content: defaultContent,
    transition: "fade" as SlideTransition,
  });

  revalidatePath("/genspark");
  return presentation;
}

export async function updatePresentation(
  id: string,
  data: {
    title?: string;
    theme?: PresentationTheme;
    description?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.theme !== undefined) updateData.theme = data.theme;
  if (data.description !== undefined) updateData.description = data.description;

  const { error } = await supabase
    .from("presentations")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/genspark");
}

export async function deletePresentation(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("presentations").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/genspark");
}

export async function duplicatePresentation(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Recuperer la presentation source
  const { data: source } = await supabase
    .from("presentations")
    .select("*")
    .eq("id", id)
    .single();

  if (!source) throw new Error("Présentation introuvable");

  // Recuperer les slides source
  const { data: sourceSlides } = await supabase
    .from("presentation_slides")
    .select("*")
    .eq("presentation_id", id)
    .order("position", { ascending: true });

  // Creer la copie de la presentation
  const { data: copy, error: copyError } = await supabase
    .from("presentations")
    .insert({
      title: `${source.title} (copie)`,
      description: source.description,
      theme: source.theme,
      aspect_ratio: source.aspect_ratio,
      is_template: false,
      generation_prompt: source.generation_prompt,
      created_by: user.id,
    })
    .select()
    .single();

  if (copyError) throw new Error(copyError.message);

  // Copier tous les slides
  if (sourceSlides && sourceSlides.length > 0) {
    const newSlides = sourceSlides.map((slide) => ({
      presentation_id: copy.id,
      position: slide.position,
      layout: slide.layout,
      content: slide.content,
      notes: slide.notes,
      transition: slide.transition,
    }));

    const { error: slidesError } = await supabase
      .from("presentation_slides")
      .insert(newSlides);

    if (slidesError) throw new Error(slidesError.message);
  }

  revalidatePath("/genspark");
  return copy;
}

// ---------------------
// CRUD Slides
// ---------------------

export async function addSlide(
  presentationId: string,
  data: {
    layout: SlideLayout;
    position?: number;
    content?: SlideContent;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  let position = data.position;

  // Si pas de position, ajouter a la fin
  if (position === undefined) {
    const { data: lastSlide } = await supabase
      .from("presentation_slides")
      .select("position")
      .eq("presentation_id", presentationId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    position = lastSlide ? lastSlide.position + 1 : 0;
  }

  const { data: slide, error } = await supabase
    .from("presentation_slides")
    .insert({
      presentation_id: presentationId,
      position,
      layout: data.layout,
      content: data.content || {},
      transition: "fade" as SlideTransition,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/genspark");
  return slide;
}

export async function updateSlide(
  slideId: string,
  data: {
    layout?: SlideLayout;
    content?: SlideContent;
    notes?: string;
    transition?: SlideTransition;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const updateData: Record<string, unknown> = {};
  if (data.layout !== undefined) updateData.layout = data.layout;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.transition !== undefined) updateData.transition = data.transition;

  const { error } = await supabase
    .from("presentation_slides")
    .update(updateData)
    .eq("id", slideId);

  if (error) throw new Error(error.message);
  revalidatePath("/genspark");
}

export async function deleteSlide(slideId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Recuperer le slide pour connaitre la presentation
  const { data: slide } = await supabase
    .from("presentation_slides")
    .select("presentation_id")
    .eq("id", slideId)
    .single();

  if (!slide) throw new Error("Slide introuvable");

  // Supprimer le slide
  const { error } = await supabase
    .from("presentation_slides")
    .delete()
    .eq("id", slideId);

  if (error) throw new Error(error.message);

  // Reordonner les slides restants
  const { data: remainingSlides } = await supabase
    .from("presentation_slides")
    .select("id")
    .eq("presentation_id", slide.presentation_id)
    .order("position", { ascending: true });

  if (remainingSlides && remainingSlides.length > 0) {
    for (let i = 0; i < remainingSlides.length; i++) {
      await supabase
        .from("presentation_slides")
        .update({ position: i })
        .eq("id", remainingSlides[i].id);
    }
  }

  revalidatePath("/genspark");
}

export async function reorderSlides(
  presentationId: string,
  slideIds: string[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Mettre a jour les positions selon l'ordre du tableau
  for (let i = 0; i < slideIds.length; i++) {
    const { error } = await supabase
      .from("presentation_slides")
      .update({ position: i })
      .eq("id", slideIds[i])
      .eq("presentation_id", presentationId);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/genspark");
}

// ---------------------
// AI Generation
// ---------------------

interface AISlide {
  layout: SlideLayout;
  content: SlideContent;
  notes?: string;
}

interface AIPresentation {
  title: string;
  description: string;
  slides: AISlide[];
}

export async function generatePresentation(params: {
  prompt: string;
  slideCount?: number;
  audience?: string;
  tone?: string;
  theme?: PresentationTheme;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  console.log(
    "[GenSpark] Starting generation for user:",
    user.id,
    "prompt:",
    params.prompt.substring(0, 50),
  );

  const slideCount = params.slideCount || 8;
  const audienceHint = params.audience
    ? `\nPublic cible : ${params.audience}`
    : "";
  const toneHint = params.tone ? `\nTon : ${params.tone}` : "";

  let aiResult: AIPresentation;
  try {
    aiResult = await aiJSON<AIPresentation>(
      `Génère une présentation complète sur le sujet suivant :
"${params.prompt}"
${audienceHint}${toneHint}

La présentation doit contenir exactement ${slideCount} slides.

Layouts disponibles : "title", "title_content", "bullets", "two_columns", "image_left", "image_right", "quote", "section", "blank".

Pour chaque slide, fournis le contenu adapté au layout :
- title : { title, subtitle }
- title_content : { title, body }
- bullets : { title, bullets: string[] }
- two_columns : { title, column_left, column_right }
- quote : { quote, quote_author }
- section : { title, subtitle }
- image_left / image_right : { title, body, image_alt }
- blank : { body }

Le premier slide doit être de layout "title".
Le dernier slide devrait être un résumé ou un call-to-action.

Réponds avec ce format JSON exact (tableau de slides complet, pas de raccourci) :
{"title": "Titre", "description": "Description courte", "slides": [{"layout": "title", "content": {"title": "Titre slide", "subtitle": "Sous-titre"}, "notes": "Notes"}]}

Contenu en français.`,
      {
        system:
          "Tu es un expert en création de présentations professionnelles. Tu crées des présentations structurées, visuellement cohérentes et impactantes. Chaque slide doit avoir un message clair. Les notes du présentateur doivent aider à délivrer le message.",
        model: GENSPARK_MODEL,
        maxTokens: 4000,
      },
    );
  } catch (err) {
    console.error("[GenSpark AI] Erreur generation:", err);
    throw new Error(
      `Erreur IA : ${err instanceof Error ? err.message : "Impossible de générer la présentation"}`,
    );
  }

  // Creer la presentation en base
  const { data: presentation, error: presError } = await supabase
    .from("presentations")
    .insert({
      title: aiResult.title,
      description: aiResult.description,
      theme: params.theme || "dark",
      is_template: false,
      generation_prompt: params.prompt,
      created_by: user.id,
    })
    .select()
    .single();

  if (presError) throw new Error(presError.message);

  // Inserer tous les slides
  const slidesData = aiResult.slides.map((slide, index) => ({
    presentation_id: presentation.id,
    position: index,
    layout: slide.layout,
    content: slide.content,
    notes: slide.notes || null,
    transition: "fade" as SlideTransition,
  }));

  const { error: slidesError } = await supabase
    .from("presentation_slides")
    .insert(slidesData);

  if (slidesError) throw new Error(slidesError.message);

  revalidatePath("/genspark");
  return { id: presentation.id };
}

export async function generateGuideQuestions(topic: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const result = await aiComplete(
    `Pour le sujet de présentation suivant : "${topic}"

Génère 4 à 5 questions pertinentes qui aideront l'utilisateur à mieux définir sa présentation. Les questions doivent couvrir :
- Le public cible
- L'objectif principal de la présentation
- Les points clés à aborder
- Le niveau de détail souhaité
- Le contexte de la présentation (conférence, réunion, formation, etc.)

Réponds UNIQUEMENT avec un tableau JSON de strings, sans markdown :
["Question 1 ?", "Question 2 ?", ...]`,
    {
      system:
        "Tu es un consultant en communication. Tu aides à structurer des présentations en posant les bonnes questions. Réponds UNIQUEMENT en JSON valide.",
      model: GENSPARK_MODEL,
      maxTokens: 500,
      temperature: 0.7,
    },
  );

  // Parser le resultat
  const cleaned = result
    .replace(/^```json?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as string[];
  } catch {
    // Fallback si le parsing echoue
    return [
      "Quel est le public cible de votre présentation ?",
      "Quel est l'objectif principal que vous souhaitez atteindre ?",
      "Quels sont les 3 points clés à retenir ?",
      "Quel est le contexte de cette présentation (réunion, conférence, formation) ?",
      "Quel niveau de détail technique est attendu ?",
    ];
  }
}

export async function generateFromGuide(answers: {
  topic: string;
  answers: { question: string; answer: string }[];
}) {
  const answersText = answers.answers
    .map((a) => `Q: ${a.question}\nR: ${a.answer}`)
    .join("\n\n");

  const enrichedPrompt = `Sujet : ${answers.topic}

Informations complémentaires fournies par l'utilisateur :
${answersText}

Crée une présentation complète en tenant compte de toutes ces réponses pour adapter le contenu, le ton et le niveau de détail.`;

  return generatePresentation({ prompt: enrichedPrompt });
}

export async function regenerateSlide(slideId: string, instruction: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Recuperer le slide actuel
  const { data: currentSlide } = await supabase
    .from("presentation_slides")
    .select("*")
    .eq("id", slideId)
    .single();

  if (!currentSlide) throw new Error("Slide introuvable");

  const currentContent = currentSlide.content as SlideContent;

  const newContent = await aiJSON<SlideContent>(
    `Voici le contenu actuel d'un slide de présentation (layout: ${currentSlide.layout}) :
${JSON.stringify(currentContent, null, 2)}

Instruction de l'utilisateur : "${instruction}"

Régénère le contenu du slide en suivant l'instruction. Conserve le même format de contenu adapté au layout "${currentSlide.layout}".

Layouts et champs attendus :
- title : { title, subtitle }
- title_content : { title, body }
- bullets : { title, bullets: string[] }
- two_columns : { title, column_left, column_right }
- quote : { quote, quote_author }
- section : { title, subtitle }
- image_left / image_right : { title, body, image_alt }
- blank : { body }

Réponds avec le JSON du contenu uniquement.`,
    {
      system:
        "Tu es un expert en création de présentations. Tu modifies le contenu des slides selon les instructions de l'utilisateur tout en maintenant la cohérence et la qualité.",
      model: GENSPARK_MODEL,
      maxTokens: 1000,
    },
  );

  // Mettre a jour le slide
  const { error } = await supabase
    .from("presentation_slides")
    .update({ content: newContent })
    .eq("id", slideId);

  if (error) throw new Error(error.message);

  revalidatePath("/genspark");

  // Retourner le slide mis a jour
  const { data: updatedSlide } = await supabase
    .from("presentation_slides")
    .select("*")
    .eq("id", slideId)
    .single();

  return updatedSlide;
}

// ---------------------
// Sharing
// ---------------------

export async function sharePresentation(params: {
  presentationId: string;
  sharedWithEmail: string;
  permission: "view" | "edit";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Chercher l'utilisateur par email
  const { data: targetUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", params.sharedWithEmail)
    .single();

  if (!targetUser) throw new Error("Utilisateur introuvable avec cet email");

  if (targetUser.id === user.id)
    throw new Error("Vous ne pouvez pas partager avec vous-même");

  // Verifier si le partage existe deja
  const { data: existing } = await supabase
    .from("presentation_shares")
    .select("id")
    .eq("presentation_id", params.presentationId)
    .eq("shared_with", targetUser.id)
    .maybeSingle();

  if (existing) {
    // Mettre a jour la permission
    await supabase
      .from("presentation_shares")
      .update({ permission: params.permission })
      .eq("id", existing.id);
  } else {
    // Creer le partage
    const { error } = await supabase.from("presentation_shares").insert({
      presentation_id: params.presentationId,
      shared_by: user.id,
      shared_with: targetUser.id,
      permission: params.permission,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/genspark");
}

export async function getPresentationShares(presentationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("presentation_shares")
    .select("id, presentation_id, permission, created_at, shared_with")
    .eq("presentation_id", presentationId);

  if (!data || data.length === 0) return [];

  // Recuperer les noms/emails des utilisateurs
  const userIds = data.map((s) => s.shared_with).filter(Boolean) as string[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [
      p.id,
      { name: p.full_name || "Inconnu", email: p.email || "" },
    ]),
  );

  return data.map((share) => ({
    id: share.id,
    presentationId: share.presentation_id,
    permission: share.permission,
    createdAt: share.created_at,
    userName: profileMap.get(share.shared_with || "")?.name || "Inconnu",
    userEmail: profileMap.get(share.shared_with || "")?.email || "",
  }));
}

export async function removePresentationShare(shareId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("presentation_shares")
    .delete()
    .eq("id", shareId);

  if (error) throw new Error(error.message);
  revalidatePath("/genspark");
}

// ---------------------
// Templates
// ---------------------

export async function getPresentationTemplates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presentations")
    .select("*, presentation_slides(id)")
    .eq("is_template", true)
    .order("template_category", { ascending: true });

  return (data || []).map((p) => ({
    ...p,
    slide_count: Array.isArray(p.presentation_slides)
      ? p.presentation_slides.length
      : 0,
    presentation_slides: undefined,
  }));
}

export async function createFromTemplate(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Recuperer le template
  const { data: template } = await supabase
    .from("presentations")
    .select("*")
    .eq("id", templateId)
    .eq("is_template", true)
    .single();

  if (!template) throw new Error("Template introuvable");

  // Recuperer les slides du template
  const { data: templateSlides } = await supabase
    .from("presentation_slides")
    .select("*")
    .eq("presentation_id", templateId)
    .order("position", { ascending: true });

  // Creer la nouvelle presentation
  const { data: presentation, error: presError } = await supabase
    .from("presentations")
    .insert({
      title: `${template.title} (copie)`,
      description: template.description,
      theme: template.theme,
      aspect_ratio: template.aspect_ratio,
      is_template: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (presError) throw new Error(presError.message);

  // Copier les slides
  if (templateSlides && templateSlides.length > 0) {
    const newSlides = templateSlides.map((slide) => ({
      presentation_id: presentation.id,
      position: slide.position,
      layout: slide.layout,
      content: slide.content,
      notes: slide.notes,
      transition: slide.transition,
    }));

    const { error: slidesError } = await supabase
      .from("presentation_slides")
      .insert(newSlides);

    if (slidesError) throw new Error(slidesError.message);
  }

  revalidatePath("/genspark");
  return presentation;
}
