import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// POST /api/instagram-search
// Tries fast tiers (Unipile, profile lookup, local DB) with strict timeouts.
// If all fail, starts search actor async and returns { pending: true, runId }.
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 3000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await req.json()) as { query: string };
  const query = body.query?.trim() || "";

  if (!query) {
    return NextResponse.json({ error: "Le terme de recherche est requis" });
  }

  // --- Tier 1: Unipile (3s timeout) ---
  try {
    const dsn = process.env.UNIPILE_DSN;
    const apiKey = process.env.UNIPILE_API_KEY;
    if (dsn && apiKey) {
      // Find Instagram account ID
      const accountsRes = await fetchWithTimeout(
        `${dsn}/api/v1/accounts`,
        { headers: { "X-API-KEY": apiKey }, timeoutMs: 3000 },
      );
      if (accountsRes.ok) {
        const accountsData = (await accountsRes.json()) as {
          items?: Array<{ id: string; type?: string; provider?: string }>;
        };
        const igAccount = (accountsData.items || []).find(
          (a) => (a.type || a.provider || "").toUpperCase() === "INSTAGRAM",
        );

        if (igAccount) {
          const searchRes = await fetchWithTimeout(
            `${dsn}/api/v1/users/search?account_id=${igAccount.id}&keyword=${encodeURIComponent(query)}&limit=20`,
            { headers: { "X-API-KEY": apiKey }, timeoutMs: 3000 },
          );
          if (searchRes.ok) {
            const data = (await searchRes.json()) as {
              items?: Array<{
                id?: string;
                first_name?: string;
                last_name?: string;
                username?: string;
                biography?: string;
                profile_picture_url?: string;
                followers_count?: number;
              }>;
            };
            const results = (data.items || []).map((p) => ({
              id: p.id || p.username || "",
              name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || "",
              username: p.username || null,
              biography: p.biography || null,
              profile_url: p.username ? `https://instagram.com/${p.username}` : null,
              source: "unipile" as const,
            }));
            if (results.length > 0) {
              return NextResponse.json({ data: results });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[Instagram Search] Unipile error:", err instanceof Error ? err.message : err);
  }

  // --- Tier 2: Local DB (instant) ---
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, name, profile_url, status")
    .eq("platform", "instagram")
    .ilike("name", `%${query}%`)
    .limit(20);

  if (prospects && prospects.length > 0) {
    const results = prospects.map((p) => ({
      id: p.id,
      name: p.name,
      username: null as string | null,
      biography: null as string | null,
      profile_url: p.profile_url,
      source: "local_database" as const,
    }));
    return NextResponse.json({ data: results });
  }

  // --- Tier 3: Start search actor ASYNC ---
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    return NextResponse.json({
      data: [],
      error: "Aucun résultat trouvé. Clé API de recherche non configurée.",
    });
  }

  try {
    const runRes = await fetchWithTimeout(
      `https://api.apify.com/v2/acts/apify~instagram-search-scraper/runs?token=${apifyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: query,
          searchType: "user",
          searchLimit: 20,
        }),
        timeoutMs: 5000,
      },
    );

    if (!runRes.ok) {
      console.error("[Instagram Search] Search start error:", runRes.status);
      return NextResponse.json({
        data: [],
        error: "Erreur lors du lancement de la recherche.",
      });
    }

    const run = (await runRes.json()) as {
      data?: { id?: string; defaultDatasetId?: string };
    };

    const runId = run.data?.id;
    const datasetId = run.data?.defaultDatasetId;

    if (!runId) {
      return NextResponse.json({
        data: [],
        error: "Erreur lors du lancement de la recherche.",
      });
    }

    return NextResponse.json({ pending: true, runId, datasetId });
  } catch (err) {
    console.error("[Instagram Search] Search start error:", err instanceof Error ? err.message : err);
    return NextResponse.json({
      data: [],
      error: "Erreur lors de la recherche.",
    });
  }
}
