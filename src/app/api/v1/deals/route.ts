import { NextRequest } from "next/server";
import {
  validateApiRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, supabase } = await validateApiRequest(request);
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const status = searchParams.get("status");
  const offset = (page - 1) * limit;

  let query = supabase!.from("deals").select("*", { count: "exact" });
  if (status) query = query.eq("status", status);
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error: dbError } = await query;
  if (dbError) return errorResponse("DB_ERROR", dbError.message, 500);

  return jsonResponse(data, { page, limit, total: count });
}

export async function POST(request: NextRequest) {
  const { error, user, supabase } = await validateApiRequest(request);
  if (error) return error;

  const body = await request.json();
  const { name, value, status, stage, contact_id } = body;

  if (!name)
    return errorResponse("VALIDATION", "Le champ 'name' est requis", 400);

  const { data, error: dbError } = await supabase!
    .from("deals")
    .insert({
      name,
      value: value || 0,
      status: status || "open",
      stage: stage || "prospect",
      contact_id,
      user_id: user!.id,
    })
    .select()
    .single();

  if (dbError) return errorResponse("DB_ERROR", dbError.message, 500);

  return jsonResponse(data);
}
