"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserContext } from "@/lib/hooks/user-context";
import type { Profile } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const serverCtx = useUserContext();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!serverCtx);

  useEffect(() => {
    // If we have server context, build a minimal user + profile from it
    // This avoids depending on the browser Supabase client for auth
    if (serverCtx) {
      setUser({
        id: serverCtx.userId,
        email: serverCtx.email,
      } as User);
      setProfile({
        id: serverCtx.userId,
        email: serverCtx.email,
        full_name: serverCtx.userName,
        avatar_url: serverCtx.avatarUrl,
        role: serverCtx.role,
      } as Profile);
      setLoading(false);
      return;
    }

    // Fallback: use browser Supabase client
    const supabase = createClient();

    async function getUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();
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
  }, [serverCtx]);

  return { user, profile, loading };
}
