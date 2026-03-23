"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiComplete, aiJSON, SMART_MODEL } from "@/lib/ai/client";

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
    .order("updated_at", { ascending: false })
    .limit(100);

  // Also fetch flowcharts shared with the user
  const { data: shares } = await supabase
    .from("script_shares")
    .select("script_id, permission")
    .eq("shared_with", user.id)
    .eq("script_type", "flowchart")
    .limit(100);

  let sharedFlowcharts: typeof ownFlowcharts = [];
  if (shares && shares.length > 0) {
    const sharedIds = shares.map((s) => s.script_id);
    const { data } = await supabase
      .from("script_flowcharts")
      .select("*")
      .in("id", sharedIds)
      .order("updated_at", { ascending: false })
      .limit(100);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("script_flowcharts")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return null;

  // Vérifier que l'utilisateur est propriétaire ou a un partage
  if (data.created_by !== user.id) {
    const { data: share } = await supabase
      .from("script_shares")
      .select("id")
      .eq("script_id", id)
      .eq("shared_with", user.id)
      .eq("script_type", "flowchart")
      .maybeSingle();

    // Vérifier si admin/manager
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!share && profile?.role !== "admin" && profile?.role !== "manager") {
      throw new Error("Accès non autorisé");
    }
  }

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
    expectedUpdatedAt?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Vérifier propriété ou permission d'édition
  const { data: flowchart } = await supabase
    .from("script_flowcharts")
    .select("created_by, updated_at")
    .eq("id", id)
    .single();

  if (!flowchart) throw new Error("Flowchart introuvable");

  if (flowchart.created_by !== user.id) {
    const { data: share } = await supabase
      .from("script_shares")
      .select("permission")
      .eq("script_id", id)
      .eq("shared_with", user.id)
      .eq("script_type", "flowchart")
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profile?.role !== "admin" &&
      profile?.role !== "manager" &&
      share?.permission !== "edit"
    ) {
      throw new Error("Accès non autorisé");
    }
  }

  // Optimistic locking : vérifier que updated_at n'a pas changé
  if (data.expectedUpdatedAt && flowchart.updated_at !== data.expectedUpdatedAt) {
    throw new Error("Ce script a été modifié par un autre utilisateur. Veuillez recharger la page.");
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Vérifier propriété
  const { data: flowchart } = await supabase
    .from("script_flowcharts")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!flowchart) throw new Error("Flowchart introuvable");

  if (flowchart.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "manager") {
      throw new Error("Accès non autorisé");
    }
  }

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
    .order("updated_at", { ascending: false })
    .limit(100);

  // Also fetch mind maps shared with the user
  const { data: shares } = await supabase
    .from("script_shares")
    .select("script_id, permission")
    .eq("shared_with", user.id)
    .eq("script_type", "mindmap")
    .limit(100);

  let sharedMindMaps: typeof ownMindMaps = [];
  if (shares && shares.length > 0) {
    const sharedIds = shares.map((s) => s.script_id);
    const { data } = await supabase
      .from("mind_maps")
      .select("*")
      .in("id", sharedIds)
      .order("updated_at", { ascending: false })
      .limit(100);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("mind_maps")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return null;

  // Vérifier que l'utilisateur est propriétaire ou a un partage
  if (data.created_by !== user.id) {
    const { data: share } = await supabase
      .from("script_shares")
      .select("id")
      .eq("script_id", id)
      .eq("shared_with", user.id)
      .eq("script_type", "mindmap")
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!share && profile?.role !== "admin" && profile?.role !== "manager") {
      throw new Error("Accès non autorisé");
    }
  }

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
    expectedUpdatedAt?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Vérifier propriété ou permission d'édition
  const { data: mindMap } = await supabase
    .from("mind_maps")
    .select("created_by, updated_at")
    .eq("id", id)
    .single();

  if (!mindMap) throw new Error("Mind map introuvable");

  if (mindMap.created_by !== user.id) {
    const { data: share } = await supabase
      .from("script_shares")
      .select("permission")
      .eq("script_id", id)
      .eq("shared_with", user.id)
      .eq("script_type", "mindmap")
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profile?.role !== "admin" &&
      profile?.role !== "manager" &&
      share?.permission !== "edit"
    ) {
      throw new Error("Accès non autorisé");
    }
  }

  // Optimistic locking : vérifier que updated_at n'a pas changé
  if (data.expectedUpdatedAt && mindMap.updated_at !== data.expectedUpdatedAt) {
    throw new Error("Ce script a été modifié par un autre utilisateur. Veuillez recharger la page.");
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Vérifier propriété
  const { data: mindMap } = await supabase
    .from("mind_maps")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!mindMap) throw new Error("Mind map introuvable");

  if (mindMap.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "manager") {
      throw new Error("Accès non autorisé");
    }
  }

  const { error } = await supabase.from("mind_maps").delete().eq("id", id);

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
    .order("created_at", { ascending: false })
    .limit(100);
  return data || [];
}

export async function createFlowchartFromTemplate(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Récupérer le template
  const { data: template } = await supabase
    .from("script_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) throw new Error("Template introuvable");

  // Extraire les données du flowchart
  const flowchartData = template.flowchart_data as {
    nodes?: unknown[];
    edges?: unknown[];
  } | null;

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

  const nodes = flowchartData?.nodes || defaultNodes;
  const edges = flowchartData?.edges || defaultEdges;

  // Créer le flowchart
  const { data: flowchart, error } = await supabase
    .from("script_flowcharts")
    .insert({
      title: `${template.title} (copie)`,
      description: template.content || null,
      category: template.category || null,
      nodes,
      edges,
      is_template: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/scripts");
  return flowchart;
}

// ---------------------
// AI Script Generation
// ---------------------

/**
 * Generate a full script from a mind map's nodes and edges.
 * Converts the visual mind map structure into a structured sales script.
 */
export async function generateScriptFromMindMap(mindMapId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: mindMap } = await supabase
    .from("mind_maps")
    .select("title, description, nodes, edges, created_by")
    .eq("id", mindMapId)
    .single();

  if (!mindMap) throw new Error("Mind map non trouvee");

  // Vérifier accès
  if (mindMap.created_by !== user.id) {
    const { data: share } = await supabase
      .from("script_shares")
      .select("id")
      .eq("script_id", mindMapId)
      .eq("shared_with", user.id)
      .eq("script_type", "mindmap")
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!share && profile?.role !== "admin" && profile?.role !== "manager") {
      throw new Error("Accès non autorisé");
    }
  }

  const nodes = (mindMap.nodes || []) as Array<{
    id: string;
    data: { label: string; type?: string };
  }>;
  const edges = (mindMap.edges || []) as Array<{
    source: string;
    target: string;
  }>;

  // Build a tree-like structure from nodes
  const nodeLabels = nodes
    .map((n) => `- ${n.data?.type || "node"}: ${n.data?.label || "Sans titre"}`)
    .join("\n");
  const connections = edges
    .map((e) => {
      const source = nodes.find((n) => n.id === e.source);
      const target = nodes.find((n) => n.id === e.target);
      return `  ${source?.data?.label || "?"} → ${target?.data?.label || "?"}`;
    })
    .join("\n");

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
        system:
          "Tu es un expert en scripts de vente/setting. Tu transformes des mind maps conceptuelles en scripts operationnels prets a l'emploi.",
        maxTokens: 2000,
        temperature: 0.7,
      },
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

  if (targetUser.id === user.id)
    throw new Error("Vous ne pouvez pas partager avec vous-meme");

  // Vérifier que l'utilisateur est propriétaire du script
  const table =
    params.scriptType === "flowchart" ? "script_flowcharts" : "mind_maps";
  const { data: script } = await supabase
    .from(table)
    .select("created_by")
    .eq("id", params.scriptId)
    .single();

  if (!script) throw new Error("Script introuvable");

  if (script.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "manager") {
      throw new Error("Accès non autorisé");
    }
  }

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
  const scriptTable =
    params.scriptType === "flowchart" ? "script_flowcharts" : "mind_maps";
  await supabase
    .from(scriptTable)
    .update({ is_shared: true })
    .eq("id", params.scriptId);

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
    .eq("script_id", scriptId)
    .limit(100);

  if (!data || data.length === 0) return [];

  // Get user names for shared_with
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

  // Vérifier que l'utilisateur est celui qui a partagé (propriétaire)
  const { data: share } = await supabase
    .from("script_shares")
    .select("shared_by")
    .eq("id", shareId)
    .single();

  if (!share) throw new Error("Partage introuvable");

  if (share.shared_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "manager") {
      throw new Error("Accès non autorisé");
    }
  }

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
    .eq("shared_with", user.id)
    .limit(100);

  if (!shares || shares.length === 0) return { flowcharts: [], mindmaps: [] };

  const flowchartIds = shares
    .filter((s) => s.script_type === "flowchart")
    .map((s) => s.script_id);
  const mindmapIds = shares
    .filter((s) => s.script_type === "mindmap")
    .map((s) => s.script_id);

  let flowcharts: unknown[] = [];
  let mindmaps: unknown[] = [];

  if (flowchartIds.length > 0) {
    const { data } = await supabase
      .from("script_flowcharts")
      .select("*")
      .in("id", flowchartIds)
      .limit(100);
    flowcharts = data || [];
  }

  if (mindmapIds.length > 0) {
    const { data } = await supabase
      .from("mind_maps")
      .select("*")
      .in("id", mindmapIds)
      .limit(100);
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
    .select(
      "id, title, description, nodes, edges, is_shared, created_at, updated_at, is_template",
    )
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
  const monthlyData: { month: string; flowcharts: number; mindmaps: number }[] =
    [];
  const monthNames = [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Juin",
    "Juil",
    "Août",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
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
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
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
        network === "LinkedIn"
          ? "professionnel et structuré"
          : network === "Instagram"
            ? "décontracté et direct, émojis modérés"
            : "conversationnel et personnel"
      }).
Écris en français. Sépare chaque section avec un titre clair.`,
      {
        system:
          "Tu es un expert en copywriting et setting/vente par DM. Tu crées des scripts de prospection ultra-efficaces pour des entrepreneurs francophones. Tes scripts sont naturels, jamais robotiques, et optimisés pour maximiser le taux de réponse et de booking d'appel.",
        maxTokens: 1500,
        temperature: 0.7,
      },
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
// AI Flowchart Generation
// ---------------------

interface AIFlowchartStep {
  type: "opening" | "question" | "objection" | "response" | "closing";
  label: string;
  content: string;
}

interface AIFlowchartResponse {
  title: string;
  steps: AIFlowchartStep[];
}

export async function generateAiFlowchart(params: {
  business: string;
  method?: string;
  network?: string;
  format?: "flowchart" | "mindmap";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const networkTone = params.network
    ? params.network === "LinkedIn"
      ? "professionnel et structuré"
      : params.network === "Instagram"
        ? "décontracté et direct, émojis modérés"
        : params.network === "WhatsApp"
          ? "conversationnel et personnel"
          : "direct et concis"
    : "professionnel";

  const prompt = `Génère un script de vente complet sous forme de flowchart pour le secteur suivant : "${params.business}".
${params.method ? `\nMéthode de vente à utiliser : ${params.method}` : ""}
${params.network ? `\nPlateforme : ${params.network} (ton ${networkTone})` : ""}

Le flowchart doit contenir entre 8 et 15 étapes couvrant :
- Une accroche d'ouverture percutante
- 2-3 questions de découverte pour qualifier le prospect
- 2-3 objections courantes avec leurs réponses
- Un closing efficace avec CTA

Chaque étape a un type parmi : "opening", "question", "objection", "response", "closing".
Les objections doivent être immédiatement suivies d'une étape "response".

Réponds avec ce format JSON exact :
{
  "title": "Titre du script",
  "steps": [
    { "type": "opening", "label": "Titre court", "content": "Contenu détaillé de l'étape" },
    ...
  ]
}`;

  let title: string;
  let nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: { label: string; type: string };
  }>;
  let edges: Array<{ id: string; source: string; target: string }>;

  try {
    const rawResult = await aiComplete(prompt, {
      system:
        "Tu es un expert en scripts de vente et setting. Tu crées des flowcharts de prospection structurés et efficaces pour des entrepreneurs francophones. Chaque étape doit être actionnable et concrète. Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après.",
      model: SMART_MODEL,
      maxTokens: 3000,
      temperature: 0.3,
    });

    // Nettoyer le JSON (enlever backticks markdown si présents)
    const cleaned = rawResult
      .replace(/^```json?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    const aiResult = JSON.parse(cleaned) as AIFlowchartResponse;

    title = aiResult.title || `Script IA — ${params.business}`;
    nodes = [];
    edges = [];

    let y = 50;
    let nodeIndex = 0;
    let prevNodeId: string | null = null;

    for (const step of aiResult.steps) {
      const isObjection = step.type === "objection";
      const x = isObjection ? 550 : 300;
      const nodeId = `${step.type}-${nodeIndex}`;

      nodes.push({
        id: nodeId,
        type: step.type,
        position: { x, y },
        data: { label: step.label, type: step.type },
      });

      if (prevNodeId) {
        edges.push({
          id: `e-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId,
        });
      }

      prevNodeId = nodeId;
      nodeIndex++;

      // Si c'est une objection, l'étape suivante (response) sera placée en dessous
      if (isObjection) {
        y += 180;
      } else {
        y += 180;
      }
    }
  } catch {
    // Fallback : créer un flowchart basique si l'IA échoue
    title = `Script — ${params.business}`;
    nodes = [
      {
        id: "opening-0",
        type: "opening",
        position: { x: 300, y: 50 },
        data: { label: "Accroche", type: "opening" },
      },
      {
        id: "question-1",
        type: "question",
        position: { x: 300, y: 230 },
        data: { label: "Question de découverte", type: "question" },
      },
      {
        id: "closing-2",
        type: "closing",
        position: { x: 300, y: 410 },
        data: { label: "Closing", type: "closing" },
      },
    ];
    edges = [
      {
        id: "e-opening-0-question-1",
        source: "opening-0",
        target: "question-1",
      },
      {
        id: "e-question-1-closing-2",
        source: "question-1",
        target: "closing-2",
      },
    ];
  }

  // Construire une version markdown du script a partir des noeuds
  const openingNodes = nodes.filter((n) => n.data.type === "opening");
  const questionNodes = nodes.filter((n) => n.data.type === "question");
  const objectionNodes = nodes.filter((n) => n.data.type === "objection");
  const responseNodes = nodes.filter((n) => n.data.type === "response");
  const closingNodes = nodes.filter((n) => n.data.type === "closing");

  const mdParts: string[] = [];

  if (openingNodes.length > 0) {
    mdParts.push("## Accroche");
    openingNodes.forEach((n) => mdParts.push(n.data.label));
  }

  if (questionNodes.length > 0) {
    mdParts.push("\n## Questions de découverte");
    questionNodes.forEach((n) => mdParts.push(`- ${n.data.label}`));
  }

  if (objectionNodes.length > 0 || responseNodes.length > 0) {
    mdParts.push("\n## Objections & Réponses");
    // Associer objections et reponses par ordre
    for (let i = 0; i < objectionNodes.length; i++) {
      mdParts.push(`**Objection :** ${objectionNodes[i].data.label}`);
      if (i < responseNodes.length) {
        mdParts.push(`**Réponse :** ${responseNodes[i].data.label}`);
      }
      mdParts.push("");
    }
    // Reponses orphelines
    for (let i = objectionNodes.length; i < responseNodes.length; i++) {
      mdParts.push(`**Réponse :** ${responseNodes[i].data.label}`);
    }
  }

  if (closingNodes.length > 0) {
    mdParts.push("\n## Closing");
    closingNodes.forEach((n) => mdParts.push(n.data.label));
  }

  const markdownDescription = mdParts.join("\n");

  if (params.format === "mindmap") {
    const { data: mindmap, error } = await supabase
      .from("mind_maps")
      .insert({
        title,
        description:
          markdownDescription ||
          `Mind map générée par IA pour : ${params.business}${params.network ? ` (${params.network})` : ""}`,
        category: params.network || null,
        nodes,
        edges,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    revalidatePath("/scripts");
    return { id: mindmap.id, format: "mindmap" as const };
  }

  const { data: flowchart, error } = await supabase
    .from("script_flowcharts")
    .insert({
      title,
      description:
        markdownDescription ||
        `Script généré par IA pour : ${params.business}${params.network ? ` (${params.network})` : ""}`,
      category: params.network || null,
      nodes,
      edges,
      is_template: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/scripts");
  return { id: flowchart.id, format: "flowchart" as const };
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
    .select(
      "id, title, description, category, nodes, edges, created_at, updated_at, created_by",
    )
    .eq("id", scriptId)
    .single();

  if (!flowchart) throw new Error("Script introuvable");

  // Vérifier accès (propriétaire ou partagé)
  if (flowchart.created_by !== user.id) {
    const { data: share } = await supabase
      .from("script_shares")
      .select("id")
      .eq("script_id", scriptId)
      .eq("shared_with", user.id)
      .eq("script_type", "flowchart")
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!share && profile?.role !== "admin" && profile?.role !== "manager") {
      throw new Error("Accès non autorisé");
    }
  }

  // Ne pas exposer created_by au client
  const { created_by: _, ...rest } = flowchart;
  return rest;
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
    .select(
      "id, title, description, category, nodes, edges, created_at, updated_at",
    )
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  // Shared flowcharts
  const { data: shares } = await supabase
    .from("script_shares")
    .select("script_id")
    .eq("shared_with", user.id)
    .eq("script_type", "flowchart")
    .limit(100);

  let sharedFlowcharts: typeof ownFlowcharts = [];
  if (shares && shares.length > 0) {
    const sharedIds = shares.map((s) => s.script_id);
    const { data } = await supabase
      .from("script_flowcharts")
      .select(
        "id, title, description, category, nodes, edges, created_at, updated_at",
      )
      .in("id", sharedIds)
      .order("updated_at", { ascending: false })
      .limit(100);
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
  },
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
