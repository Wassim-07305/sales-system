"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "checkbox";

export interface CustomField {
  id: string;
  entity: "deals" | "contacts" | "contracts";
  name: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required: boolean;
  position: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Field definitions – stored in a "custom_field_definitions" table.
// If the table does not exist we gracefully return an empty array.
// ---------------------------------------------------------------------------

export async function getCustomFields(
  entity: "deals" | "contacts" | "contracts",
): Promise<CustomField[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("custom_field_definitions")
    .select("*")
    .eq("entity", entity)
    .order("position", { ascending: true });

  if (error) {
    // Table may not exist yet – return empty gracefully
    console.error("getCustomFields error:", error.message);
    return [];
  }

  return (data ?? []) as CustomField[];
}

export async function getAllCustomFields(): Promise<CustomField[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("custom_field_definitions")
    .select("*")
    .order("entity")
    .order("position", { ascending: true });

  if (error) {
    console.error("getAllCustomFields error:", error.message);
    return [];
  }

  return (data ?? []) as CustomField[];
}

export async function createCustomField(field: {
  entity: string;
  name: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  // Determine next position
  const { data: existing } = await supabase
    .from("custom_field_definitions")
    .select("position")
    .eq("entity", field.entity)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing && existing.length > 0 ? (existing[0].position ?? 0) + 1 : 0;

  const { error } = await supabase.from("custom_field_definitions").insert({
    entity: field.entity,
    name: field.name,
    label: field.label,
    type: field.type,
    options: field.options ?? null,
    required: field.required,
    position: nextPosition,
    created_by: user.id,
  });

  if (error) {
    console.error("createCustomField error:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/custom-fields");
  return { success: true };
}

export async function updateCustomField(
  id: string,
  updates: Partial<Omit<CustomField, "id" | "created_at">>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { error } = await supabase
    .from("custom_field_definitions")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("updateCustomField error:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/custom-fields");
  return { success: true };
}

export async function deleteCustomField(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { error } = await supabase
    .from("custom_field_definitions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteCustomField error:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/custom-fields");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Field values – stored in the `metadata` JSONB column of entity tables.
// The metadata column holds { custom_fields: { [fieldName]: value } }
// ---------------------------------------------------------------------------

export async function getCustomFieldValues(
  entityId: string,
  entity: "deals" | "contacts" | "contracts",
): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from(entity)
    .select("metadata")
    .eq("id", entityId)
    .single();

  if (error || !data) return {};

  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  return (metadata.custom_fields ?? {}) as Record<string, unknown>;
}

export async function saveCustomFieldValues(
  entityId: string,
  entity: "deals" | "contacts" | "contracts",
  values: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  // Read current metadata to merge
  const { data: current } = await supabase
    .from(entity)
    .select("metadata")
    .eq("id", entityId)
    .single();

  const existingMetadata = (current?.metadata as Record<string, unknown>) ?? {};
  const updatedMetadata = {
    ...existingMetadata,
    custom_fields: values,
  };

  const { error } = await supabase
    .from(entity)
    .update({ metadata: updatedMetadata })
    .eq("id", entityId);

  if (error) {
    console.error("saveCustomFieldValues error:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${entity}`);
  return { success: true };
}
