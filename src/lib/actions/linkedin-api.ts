"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getApiKey } from "@/lib/api-keys";
import { getUnipileClient, isUnipileConfigured } from "@/lib/unipile";
import { callApifyActor } from "@/lib/apify";

// ---------------------------------------------------------------------------
// LinkedIn API — Unipile preferred, direct API fallback, then local DB.
// ---------------------------------------------------------------------------

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

/** Find the Unipile LinkedIn account ID if available */
async function getUnipileLinkedInAccountId(): Promise<string | null> {
  if (!isUnipileConfigured()) return null;
  try {
    const client = getUnipileClient();
    if (!client) return null;
    const response = await client.account.getAll();
    const items = Array.isArray(response)
      ? response
      : (response as { items?: unknown[] }).items || [];
    const linkedinAccount = (
      items as Array<{ id: string; type?: string; provider?: string }>
    ).find((a) => (a.type || a.provider || "").toUpperCase() === "LINKEDIN");
    return linkedinAccount?.id || null;
  } catch {
    return null;
  }
}

/** Resolve the LinkedIn access token: env var → user_settings row → null */
async function resolveToken(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const envToken = await getApiKey("LINKEDIN_ACCESS_TOKEN");
  if (envToken) return envToken;

  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "linkedin_access_token")
    .single();

  return (data?.value as string) || null;
}

// ---------------------------------------------------------------------------
// connectLinkedInAccount
// ---------------------------------------------------------------------------
export async function connectLinkedInAccount(accessToken: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!accessToken?.trim()) {
    return { error: "Le token d'accès est requis" };
  }

  // Validate token by fetching the user's own profile
  try {
    const res = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return { error: `Token invalide : ${body || res.statusText}` };
    }

    const profile = (await res.json()) as {
      sub: string;
      name: string;
      email?: string;
      picture?: string;
    };

    // Upsert the token in user_settings
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .eq("key", "linkedin_access_token")
      .single();

    if (existing) {
      await supabase
        .from("user_settings")
        .update({ value: accessToken })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_settings").insert({
        user_id: user.id,
        key: "linkedin_access_token",
        value: accessToken,
      });
    }

    // Store LinkedIn profile ID
    const { data: existingLinkedinId } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .eq("key", "linkedin_profile_id")
      .single();

    if (existingLinkedinId) {
      await supabase
        .from("user_settings")
        .update({ value: profile.sub })
        .eq("id", existingLinkedinId.id);
    } else {
      await supabase.from("user_settings").insert({
        user_id: user.id,
        key: "linkedin_profile_id",
        value: profile.sub,
      });
    }

    revalidatePath("/prospecting/prospects");
    return {
      data: {
        id: profile.sub,
        name: profile.name,
        email: profile.email || null,
        picture: profile.picture || null,
      },
    };
  } catch (err) {
    console.error("LinkedIn connect error:", err);
    return { error: "Impossible de valider le token LinkedIn" };
  }
}

// ---------------------------------------------------------------------------
// getLinkedInProfile
// ---------------------------------------------------------------------------
export async function getLinkedInProfile(profileUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!profileUrl?.trim()) {
    return { error: "L'URL du profil est requise" };
  }

  const token = await resolveToken(user.id, supabase);

  // --- Unipile path (preferred) ---
  const unipileAccountId = await getUnipileLinkedInAccountId();
  if (unipileAccountId) {
    try {
      const client = getUnipileClient();
      if (client) {
        const vanity =
          profileUrl.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1] || profileUrl;
        const response = await client.users.getProfile({
          account_id: unipileAccountId,
          identifier: vanity,
        });
        const p = response as {
          id?: string;
          first_name?: string;
          last_name?: string;
          headline?: string;
        };
        if (p.first_name || p.last_name) {
          return {
            data: {
              id: p.id || vanity,
              name: [p.first_name, p.last_name].filter(Boolean).join(" "),
              headline: p.headline || null,
              profile_url: profileUrl,
              source: "unipile" as const,
            },
          };
        }
      }
    } catch (err) {
      console.error("Unipile LinkedIn profile error, falling back:", err);
    }
  }

  // --- Direct API path ---
  if (token) {
    try {
      // Extract vanity name from URL (e.g. linkedin.com/in/john-doe)
      const vanityMatch = profileUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
      const vanityName = vanityMatch?.[1];

      if (vanityName) {
        // LinkedIn's Profile API (requires r_liteprofile or similar scope)
        const res = await fetch(
          `${LINKEDIN_API_BASE}/people/(vanityName:${encodeURIComponent(vanityName)})?projection=(id,localizedFirstName,localizedLastName,localizedHeadline,profilePicture)`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (res.ok) {
          const data = (await res.json()) as {
            id: string;
            localizedFirstName: string;
            localizedLastName: string;
            localizedHeadline?: string;
          };

          return {
            data: {
              id: data.id,
              name: `${data.localizedFirstName} ${data.localizedLastName}`,
              headline: data.localizedHeadline || null,
              profile_url: profileUrl,
              source: "linkedin_api" as const,
            },
          };
        }
      }

      console.warn("LinkedIn profile fetch failed, using fallback");
    } catch (err) {
      console.error("LinkedIn profile fetch error:", err);
    }
  }

  // --- Apify LinkedIn Profile Scraper (tier intermédiaire) ---
  try {
    const apifyResults = await callApifyActor<{
      firstName?: string;
      lastName?: string;
      fullName?: string;
      headline?: string;
      summary?: string;
      profileUrl?: string;
      email?: string;
      phone?: string;
      company?: string;
      position?: string;
      experiences?: Array<{ title?: string; company?: string }>;
      educations?: Array<{ school?: string; degree?: string }>;
      [key: string]: unknown;
    }>("dev_fusion/Linkedin-Profile-Scraper", {
      profileUrls: [profileUrl],
    });

    if (apifyResults && apifyResults.length > 0) {
      const p = apifyResults[0];
      const fullName =
        p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ");
      if (fullName) {
        return {
          data: {
            id: null,
            name: fullName,
            headline: p.headline || null,
            profile_url: p.profileUrl || profileUrl,
            source: "apify_scraper" as const,
            // Données supplémentaires fournies par Apify
            ...(p.email ? { email: p.email } : {}),
            ...(p.phone ? { phone: p.phone } : {}),
            ...(p.company ? { company: p.company } : {}),
            ...(p.position ? { position: p.position } : {}),
          },
        };
      }
    }
  } catch (apifyErr) {
    console.error("Apify LinkedIn scraper error, falling back:", apifyErr);
  }

  // --- Fallback: check local prospects table ---
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, name, profile_url, platform, status")
    .eq("platform", "linkedin")
    .ilike(
      "profile_url",
      `%${profileUrl.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "")}%`,
    )
    .limit(1)
    .single();

  if (prospect) {
    return {
      data: {
        id: prospect.id,
        name: prospect.name,
        headline: null,
        profile_url: prospect.profile_url,
        source: "local_database" as const,
      },
    };
  }

  // No data available — return error instead of fake stub
  return {
    data: null,
    error:
      "Profil LinkedIn introuvable. " +
      (!token
        ? "API LinkedIn non configurée — ajoutez LINKEDIN_ACCESS_TOKEN ou connectez votre compte dans Paramètres."
        : "Le profil n'a pas pu être récupéré via l'API. Vérifiez l'URL."),
  };
}

// ---------------------------------------------------------------------------
// sendLinkedInMessage
// ---------------------------------------------------------------------------
export async function sendLinkedInMessage(profileId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!profileId?.trim() || !message?.trim()) {
    return { error: "Le destinataire et le message sont requis" };
  }

  const token = await resolveToken(user.id, supabase);
  let externalId: string | null = null;
  let status: "sent" | "queued" | "failed" = "queued";

  // --- Unipile path (preferred) ---
  const unipileAccountId = await getUnipileLinkedInAccountId();
  if (unipileAccountId) {
    try {
      const client = getUnipileClient();
      if (client) {
        const response = await client.messaging.startNewChat({
          account_id: unipileAccountId,
          text: message,
          attendees_ids: [profileId],
        });
        const result = response as { chat_id?: string };
        externalId = result.chat_id || null;
        status = "sent";
      }
    } catch (err) {
      console.error("Unipile LinkedIn message error, falling back:", err);
    }
  }

  // --- Direct API path (fallback) ---
  if (status !== "sent" && token) {
    try {
      // Get the sender's LinkedIn URN
      const { data: senderSetting } = await supabase
        .from("user_settings")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "linkedin_profile_id")
        .single();

      const senderUrn = senderSetting?.value
        ? `urn:li:person:${senderSetting.value}`
        : null;

      if (senderUrn) {
        const res = await fetch(`${LINKEDIN_API_BASE}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202401",
          },
          body: JSON.stringify({
            recipients: [`urn:li:person:${profileId}`],
            subject: "Message",
            body: message,
            messageType: "MEMBER_TO_MEMBER",
          }),
        });

        if (res.ok) {
          const location = res.headers.get("x-restli-id");
          externalId = location || null;
          status = "sent";
        } else {
          const errorBody = await res.text();
          console.error("LinkedIn message API error:", errorBody);
          status = "failed";
        }
      }
    } catch (err) {
      console.error("LinkedIn message send error:", err);
      status = "failed";
    }
  }

  // --- Queue locally ---
  const prospectLookup = await supabase
    .from("prospects")
    .select("id")
    .eq("platform", "linkedin")
    .ilike("profile_url", `%${profileId}%`)
    .limit(1)
    .single();

  const prospectId = prospectLookup.data?.id || null;

  await supabase.from("inbox_messages").insert({
    user_id: user.id,
    prospect_id: prospectId,
    channel: "linkedin",
    direction: "outbound",
    content: message,
    external_id: externalId,
    status,
    created_at: new Date().toISOString(),
  });

  revalidatePath("/inbox");
  revalidatePath("/prospecting/prospects");

  if (!token) {
    return {
      data: { status: "queued", message_id: null },
      error:
        "API LinkedIn non configurée — message enregistré localement. Ajoutez LINKEDIN_ACCESS_TOKEN pour envoyer en direct.",
    };
  }

  if (status === "failed") {
    return { error: "Échec de l'envoi du message LinkedIn" };
  }

  return { data: { status, message_id: externalId } };
}

// ---------------------------------------------------------------------------
// searchLinkedInProfiles
// ---------------------------------------------------------------------------
export async function searchLinkedInProfiles(
  query: string,
  filters?: { location?: string; jobTitle?: string },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!query?.trim() && !filters?.jobTitle?.trim() && !filters?.location?.trim()) {
    return { error: "Le terme de recherche est requis" };
  }

  const token = await resolveToken(user.id, supabase);
  const keyword = [query, filters?.jobTitle, filters?.location]
    .filter(Boolean)
    .join(" ");

  console.log("[LinkedIn Search] keyword:", keyword, "| query:", query, "| filters:", JSON.stringify(filters));

  // --- Tier 1: Unipile (preferred — uses connected LinkedIn account) ---
  const unipileAccountId = await getUnipileLinkedInAccountId();
  console.log("[LinkedIn Search] Unipile accountId:", unipileAccountId ?? "none");

  if (unipileAccountId) {
    try {
      const dsn = process.env.UNIPILE_DSN;
      const apiKey = process.env.UNIPILE_API_KEY;
      if (dsn && apiKey) {
        // Correct Unipile endpoint: POST /api/v1/linkedin/search?account_id=XXX
        const url = `${dsn}/api/v1/linkedin/search?account_id=${unipileAccountId}`;
        const searchBody = { api: "classic", category: "people", keywords: keyword };
        console.log("[LinkedIn Search] Unipile POST:", url, JSON.stringify(searchBody));
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "X-API-KEY": apiKey,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(searchBody),
        });
        console.log("[LinkedIn Search] Unipile status:", res.status);

        if (res.ok) {
          const raw = await res.text();
          console.log("[LinkedIn Search] Unipile raw response (first 500):", raw.slice(0, 500));
          const data = JSON.parse(raw) as {
            items?: Array<{
              type?: string;
              id?: string;
              name?: string | null;
              first_name?: string;
              last_name?: string;
              headline?: string;
              location?: string | null;
              public_identifier?: string | null;
              public_profile_url?: string | null;
              profile_url?: string | null;
              profile_picture_url?: string | null;
            }>;
          };
          const results = (data.items || [])
            .filter((p) => p.type === "PEOPLE" || !p.type)
            .map((p) => ({
              id: p.id || p.public_identifier || "",
              name: p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "",
              headline: p.headline || null,
              profile_url:
                p.public_profile_url ||
                p.profile_url ||
                (p.public_identifier
                  ? `https://linkedin.com/in/${p.public_identifier}`
                  : null),
              source: "unipile" as const,
            }));
          if (results.length > 0) {
            console.log("[LinkedIn Search] Unipile returned", results.length, "results");
            return { data: results };
          }
          console.log("[LinkedIn Search] Unipile returned 0 items, falling through");
        } else {
          const errBody = await res.text();
          console.error("[LinkedIn Search] Unipile error:", res.status, errBody.slice(0, 300));
        }
      }
    } catch (err) {
      console.error("[LinkedIn Search] Unipile exception:", err);
    }
  }

  // --- Tier 2: Direct LinkedIn API ---
  if (token) {
    try {
      const res = await fetch(
        `${LINKEDIN_API_BASE}/search/people?q=keywords&keywords=${encodeURIComponent(keyword)}&count=20`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.ok) {
        const data = (await res.json()) as {
          elements: Array<{
            id: string;
            localizedFirstName: string;
            localizedLastName: string;
            localizedHeadline?: string;
          }>;
        };
        const results = (data.elements || []).map((el) => ({
          id: el.id,
          name: `${el.localizedFirstName} ${el.localizedLastName}`,
          headline: el.localizedHeadline || null,
          profile_url: null as string | null,
          source: "linkedin_api" as const,
        }));
        console.log("[LinkedIn Search] Direct API returned", results.length, "results");
        return { data: results };
      }
      console.warn("[LinkedIn Search] Direct API failed:", res.status);
    } catch (err) {
      console.error("[LinkedIn Search] Direct API error:", err);
    }
  }

  // --- Tier 3: Apify LinkedIn scraper (uses search URL — works for any query) ---
  try {
    // Build a LinkedIn search URL with the keyword
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}`;
    console.log("[LinkedIn Search] Apify search URL:", searchUrl);

    const apifyResults = await callApifyActor<{
      firstName?: string;
      lastName?: string;
      fullName?: string;
      headline?: string;
      publicIdentifier?: string;
      jobTitle?: string;
      geoLocationName?: string;
      pictureUrl?: string;
      companyName?: string;
      [key: string]: unknown;
    }>("supreme_coder/linkedin-profile-scraper", {
      urls: [{ url: searchUrl }],
    }, 300);

    console.log("[LinkedIn Search] Apify results:", apifyResults?.length ?? "null");

    if (apifyResults && apifyResults.length > 0) {
      const results = apifyResults
        .filter((p) => p.firstName || p.lastName || p.fullName)
        .map((p, idx) => {
          const name =
            p.fullName ||
            [p.firstName, p.lastName].filter(Boolean).join(" ") ||
            "";
          const vanity = p.publicIdentifier || null;
          return {
            id: vanity || `apify-${idx}`,
            name,
            headline: p.headline || p.jobTitle || null,
            profile_url: vanity
              ? `https://linkedin.com/in/${vanity}`
              : null,
            source: "apify" as const,
          };
        });
      if (results.length > 0) {
        console.log("[LinkedIn Search] Apify returned", results.length, "profiles");
        return { data: results };
      }
    }
  } catch (apifyErr) {
    console.error("[LinkedIn Search] Apify error:", apifyErr);
  }

  // --- Tier 4: Local prospects DB ---
  if (query.trim()) {
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, name, profile_url, status")
      .eq("platform", "linkedin")
      .ilike("name", `%${query}%`)
      .limit(20);

    const results = (prospects || []).map((p) => ({
      id: p.id,
      name: p.name,
      headline: null,
      profile_url: p.profile_url,
      source: "local_database" as const,
    }));

    if (results.length > 0) {
      return { data: results };
    }
  }

  return {
    data: [],
    error:
      "Aucun résultat trouvé. Consultez les Runtime Logs Vercel pour diagnostiquer.",
  };
}
