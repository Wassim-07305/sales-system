"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiComplete } from "@/lib/ai/client";

// ---------------------
// Flowcharts
// ---------------------

export async function getFlowcharts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: ownFlowcharts } = await supabase
    .from("script_flowcharts")
    .select("*")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  // Also fetch flowcharts shared with the user
  const { data: shares } = await supabase
    .from("script_shares")
    .select("script_id, permission")
    .eq("shared_with", user.id)
    .eq("script_type", "flowchart");

  let sharedFlowcharts: typeof ownFlowcharts = [];
  if (shares && shares.length > 0) {
    const sharedIds = shares.map((s) => s.script_id);
    const { data } = await supabase
      .from("script_flowcharts")
      .select("*")
      .in("id", sharedIds)
      .order("updated_at", { ascending: false });
    sharedFlowcharts = data || [];
  }

  // Merge, avoiding duplicates
  const ownIds = new Set((ownFlowcharts || []).map((f) => f.id));
  const merged = [
    ...(ownFlowcharts || []),
    ...(sharedFlowcharts || []).filter((f) => !ownIds.has(f.id)),
  ];

  return merged;
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

  const { data: ownMindMaps } = await supabase
    .from("mind_maps")
    .select("*")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  // Also fetch mind maps shared with the user
  const { data: shares } = await supabase
    .from("script_shares")
    .select("script_id, permission")
    .eq("shared_with", user.id)
    .eq("script_type", "mindmap");

  let sharedMindMaps: typeof ownMindMaps = [];
  if (shares && shares.length > 0) {
    const sharedIds = shares.map((s) => s.script_id);
    const { data } = await supabase
      .from("mind_maps")
      .select("*")
      .in("id", sharedIds)
      .order("updated_at", { ascending: false });
    sharedMindMaps = data || [];
  }

  // Merge, avoiding duplicates
  const ownIds = new Set((ownMindMaps || []).map((m) => m.id));
  const merged = [
    ...(ownMindMaps || []),
    ...(sharedMindMaps || []).filter((m) => !ownIds.has(m.id)),
  ];

  return merged;
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
// AI Script Generation (Stub)
// ---------------------

/**
 * Generate a full script from a mind map's nodes and edges.
 * Converts the visual mind map structure into a structured sales script.
 */
export async function generateScriptFromMindMap(mindMapId: string) {
  const supabase = await createClient();
  const { data: mindMap } = await supabase
    .from("mind_maps")
    .select("title, description, nodes, edges")
    .eq("id", mindMapId)
    .single();

  if (!mindMap) throw new Error("Mind map non trouvee");

  const nodes = (mindMap.nodes || []) as Array<{ id: string; data: { label: string; type?: string } }>;
  const edges = (mindMap.edges || []) as Array<{ source: string; target: string }>;

  // Build a tree-like structure from nodes
  const nodeLabels = nodes.map((n) => `- ${n.data?.type || "node"}: ${n.data?.label || "Sans titre"}`).join("\n");
  const connections = edges.map((e) => {
    const source = nodes.find((n) => n.id === e.source);
    const target = nodes.find((n) => n.id === e.target);
    return `  ${source?.data?.label || "?"} → ${target?.data?.label || "?"}`;
  }).join("\n");

  try {
    const script = await aiComplete(
      `Transforme cette mind map de vente en un script de prospection complet et structure.

MIND MAP : ${mindMap.title}
${mindMap.description ? `Description : ${mindMap.description}` : ""}

NOEUDS :
${nodeLabels}

CONNEXIONS :
${connections}

Genere un script complet avec :
1. Accroche initiale basee sur le noeud racine
2. Questions de decouverte basees sur les branches
3. Gestion des objections identifiees dans les noeuds
4. Transitions entre chaque etape
5. CTA/closing final

Format : texte structure avec titres clairs (## Section).
En francais, tutoiement.`,
      {
        system: "Tu es un expert en scripts de vente/setting. Tu transformes des mind maps conceptuelles en scripts operationnels prets a l'emploi.",
        maxTokens: 2000,
        temperature: 0.7,
      }
    );

    return { content: script, title: mindMap.title };
  } catch {
    return {
      content: `Script genere depuis : ${mindMap.title}\n\n${nodeLabels}`,
      title: mindMap.title,
    };
  }
}

// ---------------------
// Script Sharing
// ---------------------

export async function shareScript(params: {
  scriptId: string;
  scriptType: "flowchart" | "mindmap";
  sharedWithEmail: string;
  permission: "view" | "edit";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Look up user by email in profiles
  const { data: targetUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", params.sharedWithEmail)
    .single();

  if (!targetUser) throw new Error("Utilisateur introuvable avec cet email");

  if (targetUser.id === user.id) throw new Error("Vous ne pouvez pas partager avec vous-meme");

  // Check if share already exists
  const { data: existing } = await supabase
    .from("script_shares")
    .select("id")
    .eq("script_id", params.scriptId)
    .eq("shared_with", targetUser.id)
    .eq("script_type", params.scriptType)
    .maybeSingle();

  if (existing) {
    // Update permission
    await supabase
      .from("script_shares")
      .update({ permission: params.permission })
      .eq("id", existing.id);
  } else {
    // Insert new share
    const { error } = await supabase.from("script_shares").insert({
      script_id: params.scriptId,
      script_type: params.scriptType,
      shared_by: user.id,
      shared_with: targetUser.id,
      permission: params.permission,
    });
    if (error) throw new Error(error.message);
  }

  // Set is_shared flag on the script
  const table = params.scriptType === "flowchart" ? "script_flowcharts" : "mind_maps";
  await supabase.from(table).update({ is_shared: true }).eq("id", params.scriptId);

  revalidatePath("/scripts");
}

export async function getScriptShares(scriptId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("script_shares")
    .select("id, script_id, script_type, permission, created_at, shared_with")
    .eq("script_id", scriptId);

  if (!data || data.length === 0) return [];

  // Get user names for shared_with
  const userIds = data.map((s) => s.shared_with).filter(Boolean) as string[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, { name: p.full_name || "Inconnu", email: p.email || "" }])
  );

  return data.map((share) => ({
    id: share.id,
    scriptId: share.script_id,
    scriptType: share.script_type,
    permission: share.permission,
    createdAt: share.created_at,
    userName: profileMap.get(share.shared_with || "")?.name || "Inconnu",
    userEmail: profileMap.get(share.shared_with || "")?.email || "",
  }));
}

export async function removeScriptShare(shareId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("script_shares")
    .delete()
    .eq("id", shareId);

  if (error) throw new Error(error.message);
  revalidatePath("/scripts");
}

export async function getSharedWithMe() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { flowcharts: [], mindmaps: [] };

  const { data: shares } = await supabase
    .from("script_shares")
    .select("script_id, script_type, permission")
    .eq("shared_with", user.id);

  if (!shares || shares.length === 0) return { flowcharts: [], mindmaps: [] };

  const flowchartIds = shares.filter((s) => s.script_type === "flowchart").map((s) => s.script_id);
  const mindmapIds = shares.filter((s) => s.script_type === "mindmap").map((s) => s.script_id);

  let flowcharts: unknown[] = [];
  let mindmaps: unknown[] = [];

  if (flowchartIds.length > 0) {
    const { data } = await supabase
      .from("script_flowcharts")
      .select("*")
      .in("id", flowchartIds);
    flowcharts = data || [];
  }

  if (mindmapIds.length > 0) {
    const { data } = await supabase
      .from("mind_maps")
      .select("*")
      .in("id", mindmapIds);
    mindmaps = data || [];
  }

  return { flowcharts, mindmaps };
}

// ---------------------
// Script Analytics
// ---------------------

export async function getScriptAnalytics() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Fetch all user's flowcharts
  const { data: flowcharts } = await supabase
    .from("script_flowcharts")
    .select("id, title, description, nodes, edges, is_shared, created_at, updated_at, is_template")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  // Fetch all user's mind maps
  const { data: mindMaps } = await supabase
    .from("mind_maps")
    .select("id, title, description, nodes, is_shared, created_at, updated_at")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  const allFlowcharts = flowcharts || [];
  const allMindMaps = mindMaps || [];

  // Total counts
  const totalFlowcharts = allFlowcharts.length;
  const totalMindMaps = allMindMaps.length;
  const totalScripts = totalFlowcharts + totalMindMaps;

  // Shared vs personal
  const sharedFlowcharts = allFlowcharts.filter((f) => f.is_shared).length;
  const sharedMindMaps = allMindMaps.filter((m) => m.is_shared).length;
  const totalShared = sharedFlowcharts + sharedMindMaps;
  const totalPersonal = totalScripts - totalShared;

  // Average nodes per flowchart
  let avgNodes = 0;
  if (allFlowcharts.length > 0) {
    const totalNodes = allFlowcharts.reduce((sum, f) => {
      const nodes = Array.isArray(f.nodes) ? f.nodes.length : 0;
      return sum + nodes;
    }, 0);
    avgNodes = Math.round((totalNodes / allFlowcharts.length) * 10) / 10;
  }

  // Scripts created per month (last 6 months)
  const now = new Date();
  const monthlyData: { month: string; flowcharts: number; mindmaps: number }[] = [];
  const monthNames = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
  ];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const label = `${monthNames[month]} ${year}`;

    const fcCount = allFlowcharts.filter((f) => {
      const d = new Date(f.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;

    const mmCount = allMindMaps.filter((m) => {
      const d = new Date(m.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;

    monthlyData.push({ month: label, flowcharts: fcCount, mindmaps: mmCount });
  }

  // Get share counts per script for top scripts
  const { data: shares } = await supabase
    .from("script_shares")
    .select("script_id, script_type")
    .eq("shared_by", user.id);

  const shareCountMap = new Map<string, number>();
  (shares || []).forEach((s) => {
    shareCountMap.set(s.script_id, (shareCountMap.get(s.script_id) || 0) + 1);
  });

  // Build top scripts list (combine flowcharts & mindmaps, sort by share count then updated_at)
  type TopScript = {
    id: string;
    title: string;
    type: "flowchart" | "mindmap";
    sharesCount: number;
    updatedAt: string;
    nodesCount: number;
  };

  const allScriptsList: TopScript[] = [
    ...allFlowcharts.map((f) => ({
      id: f.id,
      title: f.title,
      type: "flowchart" as const,
      sharesCount: shareCountMap.get(f.id) || 0,
      updatedAt: f.updated_at,
      nodesCount: Array.isArray(f.nodes) ? f.nodes.length : 0,
    })),
    ...allMindMaps.map((m) => ({
      id: m.id,
      title: m.title,
      type: "mindmap" as const,
      sharesCount: shareCountMap.get(m.id) || 0,
      updatedAt: m.updated_at,
      nodesCount: Array.isArray(m.nodes) ? m.nodes.length : 0,
    })),
  ];

  allScriptsList.sort((a, b) => {
    if (b.sharesCount !== a.sharesCount) return b.sharesCount - a.sharesCount;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const topScripts = allScriptsList.slice(0, 10);

  // Recently updated (last 5)
  const recentlyUpdated = allScriptsList
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return {
    totalScripts,
    totalFlowcharts,
    totalMindMaps,
    totalShared,
    totalPersonal,
    avgNodes,
    monthlyData,
    topScripts,
    recentlyUpdated,
  };
}

export async function generateAiScript(niche: string, network: string) {
  try {
    const content = await aiComplete(
      `Génère un script de setting/prospection complet pour la niche "${niche}" sur ${network}.

Le script doit inclure :
1. **Premier message d'accroche** — personnalisé, pas générique, qui capte l'attention
2. **Message de valeur** — si la personne répond positivement, apporter de la valeur
3. **Relance 1** — si pas de réponse après 2 jours
4. **Relance 2** — si toujours pas de réponse après 3 jours supplémentaires
5. **Gestion d'objection "pas intéressé"** — réponse pour relancer la conversation
6. **Gestion d'objection "trop cher"** — réponse pour justifier la valeur
7. **Gestion d'objection "pas le temps"** — réponse empathique
8. **CTA final** — message pour proposer un appel

Utilise [Prénom] comme placeholder pour le nom du prospect.
Adapte le ton au réseau ${network} (${
      network === "LinkedIn" ? "professionnel et structuré"
      : network === "Instagram" ? "décontracté et direct, émojis modérés"
      : "conversationnel et personnel"
    }).
Écris en français. Sépare chaque section avec un titre clair.`,
      {
        system: "Tu es un expert en copywriting et setting/vente par DM. Tu crées des scripts de prospection ultra-efficaces pour des entrepreneurs francophones. Tes scripts sont naturels, jamais robotiques, et optimisés pour maximiser le taux de réponse et de booking d'appel.",
        maxTokens: 1500,
        temperature: 0.7,
      }
    );

    return { content, niche, network };
  } catch {
    return {
      content: `Bonjour [Prénom],\n\nJe suis spécialisé en ${niche} et je pense que nous pourrions collaborer.\n\nSeriez-vous disponible pour un échange de 15 minutes cette semaine ?\n\nCordialement`,
      niche,
      network,
    };
  }
}

// ---------------------
// Script Training & Simulation
// ---------------------

export async function getScriptForTraining(scriptId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: flowchart } = await supabase
    .from("script_flowcharts")
    .select("id, title, description, category, nodes, edges, created_at, updated_at")
    .eq("id", scriptId)
    .single();

  if (!flowchart) throw new Error("Script introuvable");

  return flowchart;
}

export async function getScriptsForTraining() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Own flowcharts
  const { data: ownFlowcharts } = await supabase
    .from("script_flowcharts")
    .select("id, title, description, category, nodes, edges, created_at, updated_at")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  // Shared flowcharts
  const { data: shares } = await supabase
    .from("script_shares")
    .select("script_id")
    .eq("shared_with", user.id)
    .eq("script_type", "flowchart");

  let sharedFlowcharts: typeof ownFlowcharts = [];
  if (shares && shares.length > 0) {
    const sharedIds = shares.map((s) => s.script_id);
    const { data } = await supabase
      .from("script_flowcharts")
      .select("id, title, description, category, nodes, edges, created_at, updated_at")
      .in("id", sharedIds)
      .order("updated_at", { ascending: false });
    sharedFlowcharts = data || [];
  }

  const ownIds = new Set((ownFlowcharts || []).map((f) => f.id));
  const merged = [
    ...(ownFlowcharts || []),
    ...(sharedFlowcharts || []).filter((f) => !ownIds.has(f.id)),
  ];

  return merged;
}

export async function saveTrainingResult(
  scriptId: string,
  result: {
    score: number;
    duration: number;
    missedNodes: string[];
    feedback: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("script_training_results")
    .insert({
      script_id: scriptId,
      user_id: user.id,
      score: result.score,
      duration: result.duration,
      missed_nodes: result.missedNodes,
      feedback: result.feedback,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/scripts/training");
  return data;
}

export async function getTrainingHistory(scriptId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("script_training_results")
    .select("*, script_flowcharts(id, title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (scriptId) {
    query = query.eq("script_id", scriptId);
  }

  const { data } = await query.limit(50);
  return data || [];
}
