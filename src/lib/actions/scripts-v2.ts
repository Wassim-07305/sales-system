"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------
// Flowcharts
// ---------------------

export async function getFlowcharts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("script_flowcharts")
    .select("*")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });
  return data || [];
}

export async function getFlowchart(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("script_flowcharts")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function createFlowchart(data: {
  title: string;
  description?: string;
  category?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const defaultNodes = [
    {
      id: "opening-1",
      type: "opening",
      position: { x: 250, y: 50 },
      data: { label: "Accroche", type: "opening" },
    },
    {
      id: "question-1",
      type: "question",
      position: { x: 250, y: 200 },
      data: { label: "Question de découverte", type: "question" },
    },
    {
      id: "closing-1",
      type: "closing",
      position: { x: 250, y: 350 },
      data: { label: "Closing", type: "closing" },
    },
  ];

  const defaultEdges = [
    { id: "e-opening-question", source: "opening-1", target: "question-1" },
    { id: "e-question-closing", source: "question-1", target: "closing-1" },
  ];

  const { data: flowchart, error } = await supabase
    .from("script_flowcharts")
    .insert({
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      nodes: defaultNodes,
      edges: defaultEdges,
      is_template: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/scripts");
  return flowchart;
}

export async function updateFlowchart(
  id: string,
  data: {
    title?: string;
    description?: string;
    nodes?: unknown[];
    edges?: unknown[];
    category?: string;
  }
) {
  const supabase = await createClient();
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.nodes !== undefined) updateData.nodes = data.nodes;
  if (data.edges !== undefined) updateData.edges = data.edges;
  if (data.category !== undefined) updateData.category = data.category;

  const { error } = await supabase
    .from("script_flowcharts")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/scripts");
  revalidatePath(`/scripts/flowchart/${id}`);
}

export async function deleteFlowchart(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("script_flowcharts")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/scripts");
}

// ---------------------
// Mind Maps
// ---------------------

export async function getMindMaps() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("mind_maps")
    .select("*")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });
  return data || [];
}

export async function getMindMap(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mind_maps")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function createMindMap(data: {
  title: string;
  description?: string;
  category?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const defaultNodes = [
    {
      id: "root",
      type: "root",
      position: { x: 400, y: 300 },
      data: { label: data.title, type: "root" },
    },
  ];

  const defaultEdges: unknown[] = [];

  const { data: mindMap, error } = await supabase
    .from("mind_maps")
    .insert({
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      nodes: defaultNodes,
      edges: defaultEdges,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/scripts");
  return mindMap;
}

export async function updateMindMap(
  id: string,
  data: {
    title?: string;
    description?: string;
    nodes?: unknown[];
    edges?: unknown[];
    category?: string;
  }
) {
  const supabase = await createClient();
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.nodes !== undefined) updateData.nodes = data.nodes;
  if (data.edges !== undefined) updateData.edges = data.edges;
  if (data.category !== undefined) updateData.category = data.category;

  const { error } = await supabase
    .from("mind_maps")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/scripts");
  revalidatePath(`/scripts/mindmap/${id}`);
}

export async function deleteMindMap(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("mind_maps")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/scripts");
}

// ---------------------
// Script Templates
// ---------------------

export async function getScriptTemplates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("script_templates")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  return data || [];
}

// ---------------------
// AI Script Generation
// ---------------------

export async function generateAiScript(niche: string, network: string) {
  const { isAiConfigured } = await import("@/lib/ai/client");
  const fallbackContent = `Bonjour [Prénom],\n\nJe suis [Votre nom], spécialisé en ${niche}.\n\nJ'ai remarqué que vous êtes actif sur ${network} et je pense que nous pourrions collaborer.\n\nSeriez-vous disponible pour un échange de 15 minutes cette semaine ?\n\nCordialement,\n[Votre nom]`;

  if (!isAiConfigured()) {
    return { content: fallbackContent, niche, network };
  }

  try {
    const { complete } = await import("@/lib/ai/utils");
    const { SCRIPT_GENERATION_SYSTEM_PROMPT } = await import("@/lib/ai/prompts");

    const content = await complete({
      system: SCRIPT_GENERATION_SYSTEM_PROMPT,
      user: `Génère un script de vente complet pour :\n- Niche : ${niche}\n- Réseau : ${network}\n\nLe script doit être directement utilisable, avec des indications entre crochets pour les éléments à personnaliser.\nStructure : Accroche > Questions de découverte > Présentation valeur > Objections courantes > Closing.`,
      model: "SONNET",
      maxTokens: 2048,
    });

    return { content, niche, network };
  } catch {
    return { content: fallbackContent, niche, network };
  }
}
