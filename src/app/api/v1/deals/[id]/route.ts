import { NextRequest } from "next/server";
import {
  validateApiRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, supabase } = await validateApiRequest(request);
  if (error) return error;

  const { id } = await params;
  const { data, error: dbError } = await supabase!
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();
  if (dbError) return errorResponse("NOT_FOUND", "Deal non trouvé", 404);

  return jsonResponse(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, supabase } = await validateApiRequest(request);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  // Allowlist updatable fields to prevent arbitrary column manipulation
  const ALLOWED_FIELDS = [
    "title",
    "value",
    "stage_id",
    "assigned_to",
    "source",
    "notes",
    "status",
    "priority",
    "expected_close_date",
  ];
  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) sanitized[key] = body[key];
  }
  if (Object.keys(sanitized).length === 0) {
    return errorResponse("BAD_REQUEST", "Aucun champ modifiable fourni", 400);
  }

  const { data, error: dbError } = await supabase!
    .from("deals")
    .update(sanitized)
    .eq("id", id)
    .select()
    .single();
  if (dbError) return errorResponse("DB_ERROR", dbError.message, 500);

  return jsonResponse(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, supabase } = await validateApiRequest(request);
  if (error) return error;

  const { id } = await params;
  const { error: dbError } = await supabase!
    .from("deals")
    .delete()
    .eq("id", id);
  if (dbError) return errorResponse("DB_ERROR", dbError.message, 500);

  return jsonResponse({ deleted: true });
}
