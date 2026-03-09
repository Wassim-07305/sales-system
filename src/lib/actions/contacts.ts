"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DuplicateConfidence = "high" | "medium" | "low";

export interface ContactRecord {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  tags: string[] | null;
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

/**
 * Find potential duplicate contacts by matching email, phone, or similar names.
 * Returns groups of potential duplicates with a confidence score.
 */
export async function findDuplicateContacts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { groups: [], error: "Non authentifié" };

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return { groups: [], error: error.message };
  if (!contacts || contacts.length === 0) return { groups: [], error: null };

  const groups: DuplicateGroup[] = [];
  const usedPairs = new Set<string>();

  function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function addToGroup(
    contactA: ContactRecord,
    contactB: ContactRecord,
    confidence: DuplicateConfidence,
    reason: string
  ) {
    const key = pairKey(contactA.id, contactB.id);
    if (usedPairs.has(key)) return;
    usedPairs.add(key);

    // Try to merge into an existing group with the same confidence
    const existingGroup = groups.find(
      (g) =>
        g.confidence === confidence &&
        g.contacts.some(
          (c) => c.id === contactA.id || c.id === contactB.id
        )
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

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i] as ContactRecord;
      const b = contacts[j] as ContactRecord;

      // Exact email match → high
      if (a.email && b.email && normalizeStr(a.email) === normalizeStr(b.email)) {
        addToGroup(a, b, "high", "Email identique");
        continue;
      }

      // Exact phone match → high
      if (
        a.phone &&
        b.phone &&
        normalizeStr(a.phone).replace(/\s+/g, "") ===
          normalizeStr(b.phone).replace(/\s+/g, "")
      ) {
        addToGroup(a, b, "high", "Téléphone identique");
        continue;
      }

      // Same first_name + last_name (case-insensitive) → high
      if (
        a.first_name &&
        b.first_name &&
        a.last_name &&
        b.last_name &&
        normalizeStr(a.first_name) === normalizeStr(b.first_name) &&
        normalizeStr(a.last_name) === normalizeStr(b.last_name)
      ) {
        addToGroup(a, b, "high", "Nom et prénom identiques");
        continue;
      }

      // Same last_name + same company → medium
      if (
        a.last_name &&
        b.last_name &&
        a.company &&
        b.company &&
        normalizeStr(a.last_name) === normalizeStr(b.last_name) &&
        normalizeStr(a.company) === normalizeStr(b.company)
      ) {
        addToGroup(a, b, "medium", "Même nom de famille et entreprise");
        continue;
      }

      // Similar name (first 3 chars match + same company) → low
      if (
        a.first_name &&
        b.first_name &&
        a.company &&
        b.company &&
        first3Chars(a.first_name) === first3Chars(b.first_name) &&
        first3Chars(a.first_name).length >= 3 &&
        normalizeStr(a.company) === normalizeStr(b.company)
      ) {
        addToGroup(a, b, "low", "Prénom similaire et même entreprise");
        continue;
      }
    }
  }

  // Sort: high first, then medium, then low
  const order: Record<DuplicateConfidence, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  groups.sort((a, b) => order[a.confidence] - order[b.confidence]);

  return { groups, error: null };
}

/**
 * Merge secondary contacts into a primary contact.
 * Updates all related deals, bookings, calls to point to primary.
 * Deletes secondary contacts after merge.
 */
export async function mergeContacts(
  primaryId: string,
  secondaryIds: string[],
  fieldSelections: Record<string, string>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  if (!primaryId || secondaryIds.length === 0) {
    return { success: false, error: "Paramètres invalides" };
  }

  // Fetch all contacts involved
  const allIds = [primaryId, ...secondaryIds];
  const { data: contacts, error: fetchError } = await supabase
    .from("contacts")
    .select("*")
    .in("id", allIds);

  if (fetchError || !contacts) {
    return { success: false, error: fetchError?.message || "Contacts introuvables" };
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

  // Update the primary contact with merged field values
  if (Object.keys(mergedFields).length > 0) {
    mergedFields.updated_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("contacts")
      .update(mergedFields)
      .eq("id", primaryId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  }

  // Reassign related records to the primary contact
  for (const secondaryId of secondaryIds) {
    // Update deals
    await supabase
      .from("deals")
      .update({ contact_id: primaryId })
      .eq("contact_id", secondaryId);

    // Update bookings
    await supabase
      .from("bookings")
      .update({ contact_id: primaryId })
      .eq("contact_id", secondaryId);

    // Update calls
    await supabase
      .from("calls")
      .update({ contact_id: primaryId })
      .eq("contact_id", secondaryId);
  }

  // Delete secondary contacts
  const { error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .in("id", secondaryIds);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/contacts");
  revalidatePath("/contacts/duplicates");

  return { success: true, error: null };
}
