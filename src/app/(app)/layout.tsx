import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./app-shell";
import { getWhiteLabelConfig } from "@/lib/actions/white-label";
import { ensureAcademyContract } from "@/lib/actions/contracts";
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

  const [{ data: profile }, whiteLabelConfig] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    getWhiteLabelConfig().catch(() => null),
  ]);

  // If no profile yet, create one with defaults and persist to DB
  let userProfile = profile;
  if (!userProfile) {
    const fallback = {
      id: user.id,
      email: user.email || "",
      full_name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Utilisateur",
      avatar_url: null,
      role: "client_b2c" as UserRole,
      onboarding_completed: false,
    };

    await supabase.from("profiles").upsert({
      id: user.id,
      email: fallback.email,
      full_name: fallback.full_name,
      role: fallback.role,
      onboarding_completed: false,
    });

    userProfile = fallback;
  }

  // Auto-create Academy contract for B2C users
  if (userProfile.role === "client_b2c") {
    ensureAcademyContract(user.id).catch(() => {});
  }

  return (
    <AppShell
      role={userProfile.role as UserRole}
      userName={userProfile.full_name || "Utilisateur"}
      email={userProfile.email || user.email || ""}
      avatarUrl={userProfile.avatar_url}
      userId={user.id}
      whiteLabelConfig={whiteLabelConfig}
    >
      {children}
    </AppShell>
  );
}
