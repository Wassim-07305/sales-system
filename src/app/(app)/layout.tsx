import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./app-shell";
import type { UserRole } from "@/lib/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If no profile yet, create one with defaults
  const userProfile = profile || {
    id: user.id,
    email: user.email || "",
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Utilisateur",
    avatar_url: null,
    role: "client_b2c" as UserRole,
  };

  return (
    <AppShell
      role={userProfile.role as UserRole}
      userName={userProfile.full_name || "Utilisateur"}
      avatarUrl={userProfile.avatar_url}
    >
      {children}
    </AppShell>
  );
}
