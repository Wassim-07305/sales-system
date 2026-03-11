import { NextRequest } from "next/server";
import { validateApiRequest, jsonResponse, errorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, supabase } = await validateApiRequest(request);
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const search = searchParams.get("search");
  const offset = (page - 1) * limit;

  let query = supabase!.from("contacts").select("*", { count: "exact" });
  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error: dbError } = await query;
  if (dbError) return errorResponse("DB_ERROR", dbError.message, 500);

  return jsonResponse(data, { page, limit, total: count });
}

export async function POST(request: NextRequest) {
  const { error, user, supabase } = await validateApiRequest(request);
  if (error) return error;

  const body = await request.json();
  const { first_name, last_name, email, phone, company, position, source } = body;

  if (!first_name || !last_name) return errorResponse("VALIDATION", "Les champs 'first_name' et 'last_name' sont requis", 400);

  const { data, error: dbError } = await supabase!
    .from("contacts")
    .insert({ first_name, last_name, email, phone, company, position, source, user_id: user!.id })
    .select()
    .single();

  if (dbError) return errorResponse("DB_ERROR", dbError.message, 500);

  return jsonResponse(data);
}
