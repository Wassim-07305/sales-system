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

  const dsn = process.env.UNIPILE_DSN;
  const apiKey = process.env.UNIPILE_API_KEY;
  if (!dsn || !apiKey) {
    return NextResponse.json(
      { error: "Unipile non configuré" },
      { status: 500 }
    );
  }

  const { chatId, text } = await req.json();
  if (!chatId || !text) {
    return NextResponse.json(
      { error: "chatId et text requis" },
      { status: 400 }
    );
  }

  const res = await fetch(`${dsn}/api/v1/chats/${chatId}/messages`, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    return NextResponse.json(
      { error: `Erreur envoi: ${errorText}` },
      { status: res.status }
    );
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ success: true, data });
}
