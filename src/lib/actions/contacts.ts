"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type DuplicateConfidence = "high" | "medium" | "low";

export interface ContactRecord {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  role: string;
  avatar_url: string | null;
  niche: string | null;
  created_at: string;
  updated_at: string;
}

export interface DuplicateGroup {
  id: string;
  confidence: DuplicateConfidence;
  reason: string;
  contacts: ContactRecord[];
}

function normalizeStr(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}

function first3Chars(s: string | null | undefined): string {
  return normalizeStr(s).slice(0, 3);
}

// ─── Créer un contact ─────────────────────────────────────────────

export async function createContact(params: {
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
}) {
  try {
    const { supabase } = await requireAuth();

    if (!params.full_name || !params.email) {
      return { error: "Le nom et l'email sont requis" };
    }

    // Vérifier les doublons par email
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", params.email)
      .maybeSingle();

    if (existing) {
      return { error: "Un contact avec cet email existe déjà" };
    }

    // Use admin client to bypass RLS (admin creates contacts on behalf of others)
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .insert({
        full_name: params.full_name,
        email: params.email,
        phone: params.phone || null,
        company: params.company || null,
        role: params.role || "client_b2b",
      })
      .select()
      .single();

    if (error) return { error: error.message };

    revalidatePath("/contacts");
    revalidatePath("/utilisateurs");
    return { contact: data };
  } catch {
    return { error: "Non authentifié" };
  }
}

// ─── Tags sur les contacts ───────────────────────────────────────

export async function addContactTag(contactId: string, tag: string) {
  try {
    const { supabase } = await requireAuth();

    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return { error: "Tag vide" };

    // Fetch current tags
    const { data: contact } = await supabase
      .from("profiles")
      .select("tags")
      .eq("id", contactId)
      .single();

    if (!contact) return { error: "Contact introuvable" };

    const currentTags: string[] = Array.isArray(contact.tags)
      ? contact.tags
      : [];
    if (currentTags.includes(trimmed)) {
      return { error: "Ce tag existe déjà sur ce contact" };
    }

    const newTags = [...currentTags, trimmed];

    const { error } = await supabase
      .from("profiles")
      .update({ tags: newTags, updated_at: new Date().toISOString() })
      .eq("id", contactId);

    if (error) return { error: error.message };

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${contactId}`);
    revalidatePath("/utilisateurs");
    revalidatePath(`/utilisateurs/${contactId}`);
    return { success: true, tags: newTags };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function removeContactTag(contactId: string, tag: string) {
  try {
    const { supabase } = await requireAuth();

    const { data: contact } = await supabase
      .from("profiles")
      .select("tags")
      .eq("id", contactId)
      .single();

    if (!contact) return { error: "Contact introuvable" };

    const currentTags: string[] = Array.isArray(contact.tags)
      ? contact.tags
      : [];
    const newTags = currentTags.filter((t) => t !== tag);

    const { error } = await supabase
      .from("profiles")
      .update({ tags: newTags, updated_at: new Date().toISOString() })
      .eq("id", contactId);

    if (error) return { error: error.message };

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${contactId}`);
    revalidatePath("/utilisateurs");
    revalidatePath(`/utilisateurs/${contactId}`);
    return { success: true, tags: newTags };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function getAllContactTags() {
  try {
    const { supabase } = await requireAuth();

    const { data: contacts } = await supabase
      .from("profiles")
      .select("tags")
      .not("tags", "is", null)
      .limit(1000);

    if (!contacts) return [];

    const tagSet = new Set<string>();
    contacts.forEach((c) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t: string) => tagSet.add(t));
      }
    });

    return Array.from(tagSet).sort();
  } catch {
    return [];
  }
}

/**
 * Find potential duplicate contacts by matching email, phone, or similar names.
 * Uses Map-based O(n) lookups instead of O(n²) nested loops.
 * Fetches contacts in paginated batches of 500.
 * Returns groups of potential duplicates with a confidence score.
 */
export async function findDuplicateContacts() {
  try {
    const { supabase } = await requireAuth();

    // ── Pagination : récupérer les contacts par lots de 500 ──
    const PAGE_SIZE = 500;
    const allContacts: ContactRecord[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, phone, company, role, avatar_url, niche, created_at, updated_at",
        )
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) return { groups: [], error: error.message };
      if (!batch || batch.length === 0) break;

      allContacts.push(...(batch as ContactRecord[]));
      hasMore = batch.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    if (allContacts.length === 0) return { groups: [], error: null };

    // ── Maps de lookup pour détection O(n) ──
    const emailMap = new Map<string, ContactRecord[]>();
    const phoneMap = new Map<string, ContactRecord[]>();
    const nameMap = new Map<string, ContactRecord[]>();
    // Clé composite : nom de famille normalisé + entreprise normalisée
    const lastNameCompanyMap = new Map<string, ContactRecord[]>();
    // Clé composite : 3 premiers caractères du nom + entreprise normalisée
    const prefix3CompanyMap = new Map<string, ContactRecord[]>();

    for (const contact of allContacts) {
      // Index par email normalisé
      if (contact.email) {
        const key = normalizeStr(contact.email);
        if (key) {
          const arr = emailMap.get(key);
          if (arr) arr.push(contact);
          else emailMap.set(key, [contact]);
        }
      }

      // Index par téléphone normalisé (uniquement les chiffres)
      if (contact.phone) {
        const key = normalizeStr(contact.phone).replace(/\D/g, "");
        if (key) {
          const arr = phoneMap.get(key);
          if (arr) arr.push(contact);
          else phoneMap.set(key, [contact]);
        }
      }

      // Index par nom complet normalisé
      if (contact.full_name) {
        const key = normalizeStr(contact.full_name);
        if (key) {
          const arr = nameMap.get(key);
          if (arr) arr.push(contact);
          else nameMap.set(key, [contact]);
        }
      }

      // Index par nom de famille + entreprise (pour confiance medium)
      if (contact.full_name && contact.company) {
        const lastName = normalizeStr(contact.full_name).split(" ").pop() || "";
        const company = normalizeStr(contact.company);
        if (lastName && company) {
          const key = `${lastName}||${company}`;
          const arr = lastNameCompanyMap.get(key);
          if (arr) arr.push(contact);
          else lastNameCompanyMap.set(key, [contact]);
        }
      }

      // Index par préfixe 3 chars + entreprise (pour confiance low)
      if (contact.full_name && contact.company) {
        const prefix = first3Chars(contact.full_name);
        const company = normalizeStr(contact.company);
        if (prefix.length >= 3 && company) {
          const key = `${prefix}||${company}`;
          const arr = prefix3CompanyMap.get(key);
          if (arr) arr.push(contact);
          else prefix3CompanyMap.set(key, [contact]);
        }
      }
    }

    // ── Construction des groupes de doublons ──
    const groups: DuplicateGroup[] = [];
    const usedPairs = new Set<string>();

    function pairKey(a: string, b: string): string {
      return a < b ? `${a}|${b}` : `${b}|${a}`;
    }

    function addToGroup(
      contactA: ContactRecord,
      contactB: ContactRecord,
      confidence: DuplicateConfidence,
      reason: string,
    ) {
      const key = pairKey(contactA.id, contactB.id);
      if (usedPairs.has(key)) return;
      usedPairs.add(key);

      // Fusionner dans un groupe existant de même confiance
      const existingGroup = groups.find(
        (g) =>
          g.confidence === confidence &&
          g.contacts.some((c) => c.id === contactA.id || c.id === contactB.id),
      );

      if (existingGroup) {
        if (!existingGroup.contacts.find((c) => c.id === contactA.id)) {
          existingGroup.contacts.push(contactA);
        }
        if (!existingGroup.contacts.find((c) => c.id === contactB.id)) {
          existingGroup.contacts.push(contactB);
        }
      } else {
        groups.push({
          id: `dup-${groups.length + 1}`,
          confidence,
          reason,
          contacts: [contactA, contactB],
        });
      }
    }

    function processMapEntries(
      map: Map<string, ContactRecord[]>,
      confidence: DuplicateConfidence,
      reason: string,
    ) {
      for (const entries of Array.from(map.values())) {
        if (entries.length < 2) continue;
        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            addToGroup(entries[i], entries[j], confidence, reason);
          }
        }
      }
    }

    // High : email identique
    processMapEntries(emailMap, "high", "Email identique");
    // High : téléphone identique
    processMapEntries(phoneMap, "high", "Téléphone identique");
    // High : nom complet identique
    processMapEntries(nameMap, "high", "Nom complet identique");
    // Medium : même nom de famille + même entreprise
    processMapEntries(
      lastNameCompanyMap,
      "medium",
      "Même nom de famille et entreprise",
    );
    // Low : nom similaire (3 premiers caractères) + même entreprise
    processMapEntries(
      prefix3CompanyMap,
      "low",
      "Nom similaire et même entreprise",
    );

    // Tri : high en premier, puis medium, puis low
    const order: Record<DuplicateConfidence, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    groups.sort((a, b) => order[a.confidence] - order[b.confidence]);

    return { groups, error: null };
  } catch {
    return { groups: [], error: "Non authentifié" };
  }
}

/**
 * Merge secondary contacts into a primary contact.
 * Updates all related deals to point to primary.
 * Deletes secondary profiles after merge.
 */
export async function mergeContacts(
  primaryId: string,
  secondaryIds: string[],
  fieldSelections: Record<string, string>,
) {
  try {
    const { supabase } = await requireAuth();

    if (!primaryId || secondaryIds.length === 0) {
      return { success: false, error: "Paramètres invalides" };
    }

    // Fetch all profiles involved
    const allIds = [primaryId, ...secondaryIds];
    const { data: contacts, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", allIds);

    if (fetchError || !contacts) {
      return {
        success: false,
        error: fetchError?.message || "Contacts introuvables",
      };
    }

    // Build the merged data from field selections
    const mergedFields: Record<string, unknown> = {};
    const contactMap = new Map(contacts.map((c) => [c.id, c]));

    for (const [field, sourceId] of Object.entries(fieldSelections)) {
      const sourceContact = contactMap.get(sourceId);
      if (sourceContact && field in sourceContact) {
        mergedFields[field] = (sourceContact as Record<string, unknown>)[field];
      }
    }

    // Update the primary profile with merged field values
    if (Object.keys(mergedFields).length > 0) {
      mergedFields.updated_at = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("profiles")
        .update(mergedFields)
        .eq("id", primaryId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }

    // Reassign related records to the primary contact
    const errors: string[] = [];

    for (const secondaryId of secondaryIds) {
      // Update deals
      const { error: dealsError } = await supabase
        .from("deals")
        .update({ contact_id: primaryId })
        .eq("contact_id", secondaryId);

      if (dealsError) {
        errors.push(`Erreur mise à jour deals: ${dealsError.message}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, error: errors.join("; ") };
    }

    // Delete secondary profiles
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .in("id", secondaryIds);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/contacts");
    revalidatePath("/contacts/duplicates");

    return { success: true, error: null };
  } catch {
    return { success: false, error: "Non authentifié" };
  }
}
