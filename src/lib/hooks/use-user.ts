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
      console.log("[useUser] Starting getUser...");
      try {
        // Try getSession first (reads from cookie, no network call)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("[useUser] getSession:", session?.user?.id ?? "null", sessionError?.message ?? "ok");

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: profileData, error: profileErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();
          console.log("[useUser] profile:", profileData?.role ?? "null", profileErr?.message ?? "ok");
          setProfile(profileData);
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
      console.log("[useUser] authStateChange:", _event, session?.user?.id ?? "null");
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
