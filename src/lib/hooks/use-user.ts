"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        console.log("[useUser] getUser result:", user?.id ?? "null", error?.message ?? "ok");
        setUser(user);

        if (user) {
          const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          console.log("[useUser] profile:", profile?.role ?? "null", profileErr?.message ?? "ok");
          setProfile(profile);
        }
      } catch (err) {
        console.error("[useUser] getUser error:", err);
      }

      setLoading(false);
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(profile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, loading };
}
