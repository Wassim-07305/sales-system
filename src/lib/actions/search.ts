"use server";

import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  type: "contact" | "deal" | "booking";
  title: string;
  subtitle: string;
  href: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const q = `%${query}%`;
  const results: SearchResult[] = [];

  // Recherche contacts
  try {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, company")
      .or(
        `first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q},company.ilike.${q}`,
      )
      .limit(5);

    if (contacts) {
      for (const c of contacts) {
        results.push({
          id: c.id,
          type: "contact",
          title:
            `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
            c.email ||
            "Contact",
          subtitle: c.company || c.email || "",
          href: `/utilisateurs/${c.id}`,
        });
      }
    }
  } catch {
    // Table might not exist
  }

  // Recherche deals
  try {
    const { data: deals } = await supabase
      .from("deals")
      .select("id, title, value, stage")
      .ilike("title", q)
      .limit(5);

    if (deals) {
      for (const d of deals) {
        results.push({
          id: d.id,
          type: "deal",
          title: d.title,
          subtitle:
            `${d.value ? `${Number(d.value).toLocaleString("fr-FR")} €` : ""} ${d.stage ? `• ${d.stage}` : ""}`.trim(),
          href: `/pipeline`,
        });
      }
    }
  } catch {
    // Table might not exist
  }

  // Recherche bookings
  try {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, title, date, contact_name")
      .or(`title.ilike.${q},contact_name.ilike.${q}`)
      .limit(5);

    if (bookings) {
      for (const b of bookings) {
        results.push({
          id: b.id,
          type: "booking",
          title: b.title || b.contact_name || "Booking",
          subtitle: b.date ? new Date(b.date).toLocaleDateString("fr-FR") : "",
          href: `/bookings`,
        });
      }
    }
  } catch {
    // Table might not exist
  }

  return results;
}
