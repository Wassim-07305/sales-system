import { subscribePush, unsubscribePush } from "@/lib/actions/push";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.endpoint || !body.keys) {
      return NextResponse.json(
        { error: "Endpoint et clés requis" },
        { status: 400 }
      );
    }

    const result = await subscribePush({
      endpoint: body.endpoint,
      keys: body.keys,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const result = await unsubscribePush();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
