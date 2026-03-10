import { NextRequest } from "next/server";
import { validateApiRequest, jsonResponse, errorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await validateApiRequest(request);
  if (error) return error;

  const { id } = await params;
  const { data, error: dbError } = await supabase!.from("contacts").select("*").eq("id", id).single();
  if (dbError) return errorResponse("NOT_FOUND", "Contact non trouvé", 404);

  return jsonResponse(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await validateApiRequest(request);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const { data, error: dbError } = await supabase!.from("contacts").update(body).eq("id", id).select().single();
  if (dbError) return errorResponse("DB_ERROR", dbError.message, 500);

  return jsonResponse(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await validateApiRequest(request);
  if (error) return error;

  const { id } = await params;
  const { error: dbError } = await supabase!.from("contacts").delete().eq("id", id);
  if (dbError) return errorResponse("DB_ERROR", dbError.message, 500);

  return jsonResponse({ deleted: true });
}
