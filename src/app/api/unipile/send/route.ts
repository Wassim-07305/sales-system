import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Only team members can send via org social accounts
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || ["client_b2b", "client_b2c"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const dsn = process.env.UNIPILE_DSN;
  const apiKey = process.env.UNIPILE_API_KEY;
  if (!dsn || !apiKey) {
    return NextResponse.json(
      { error: "Unipile non configuré" },
      { status: 500 },
    );
  }

  let body: { chatId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide" },
      { status: 400 },
    );
  }

  const { chatId, text } = body;
  if (!chatId || !text || !text.trim()) {
    return NextResponse.json(
      { error: "chatId et text requis" },
      { status: 400 },
    );
  }

  // Sanitize chatId — only allow alphanumeric, hyphens, underscores
  if (!/^[\w-]+$/.test(chatId)) {
    return NextResponse.json({ error: "chatId invalide" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${dsn}/api/v1/chats/${chatId}/messages`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text.trim() }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      return NextResponse.json(
        { error: `Erreur envoi: ${errorText}` },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      return NextResponse.json(
        { error: "Timeout — le service de messagerie ne répond pas" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Erreur de connexion au service de messagerie" },
      { status: 502 },
    );
  }
}
