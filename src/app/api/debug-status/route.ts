import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check Supabase auth
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    results.auth = user ? { id: user.id, email: user.email } : "NOT_AUTHENTICATED";

    if (user) {
      // 2. Check Canal Général
      const { data: channels, error: chErr } = await supabase
        .from("channels")
        .select("id, name, type, is_archived, created_by")
        .eq("name", "Canal Général");
      results.canalGeneral = { channels, error: chErr?.message };

      // 3. Check channel_members for current user
      const { data: memberships, error: memErr } = await supabase
        .from("channel_members")
        .select("id, channel_id, profile_id, role")
        .eq("profile_id", user.id);
      results.memberships = {
        count: memberships?.length ?? 0,
        items: memberships?.slice(0, 5),
        error: memErr?.message,
      };

      // 4. Try to create Canal Général if missing
      if (!channels || channels.length === 0) {
        const { data: created, error: createErr } = await supabase
          .from("channels")
          .insert({
            name: "Canal Général",
            description: "Canal de discussion pour toute l'équipe",
            type: "group",
            created_by: user.id,
          })
          .select("id")
          .single();
        results.createAttempt = {
          created: created?.id,
          error: createErr?.message,
          code: createErr?.code,
          details: createErr?.details,
        };

        if (created) {
          const { error: memberErr } = await supabase
            .from("channel_members")
            .insert({
              channel_id: created.id,
              profile_id: user.id,
              role: "admin",
            });
          results.memberInsert = { error: memberErr?.message };
        }
      } else if (channels.length > 0) {
        // Check if user is member
        const { data: isMember } = await supabase
          .from("channel_members")
          .select("id")
          .eq("channel_id", channels[0].id)
          .eq("profile_id", user.id)
          .maybeSingle();
        results.isMemberOfGeneral = !!isMember;
        if (!isMember) {
          const { error: joinErr } = await supabase
            .from("channel_members")
            .insert({
              channel_id: channels[0].id,
              profile_id: user.id,
              role: "member",
            });
          results.joinAttempt = { error: joinErr?.message };
        }
      }
    }
  } catch (err) {
    results.supabaseError = err instanceof Error ? err.message : String(err);
  }

  // 5. Check Unipile
  const dsn = process.env.UNIPILE_DSN;
  const apiKey = process.env.UNIPILE_API_KEY;
  results.unipile = {
    dsnSet: !!dsn,
    dsnValue: dsn ? `${dsn.slice(0, 30)}...` : null,
    apiKeySet: !!apiKey,
    apiKeyLength: apiKey?.length ?? 0,
  };

  if (dsn && apiKey) {
    try {
      const res = await fetch(`${dsn}/api/v1/accounts`, {
        headers: { "X-API-KEY": apiKey, Accept: "application/json" },
      });
      const body = await res.text();
      results.unipileAccounts = {
        status: res.status,
        statusText: res.statusText,
        bodyPreview: body.slice(0, 500),
      };
    } catch (err) {
      results.unipileError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json(results, { status: 200 });
}
