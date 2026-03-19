import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UsersList } from "./users-list";
import { PageHeader } from "@/components/layout/page-header";
import { NewUserDialog } from "./new-user-dialog";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Gérez tous les utilisateurs de la plateforme"
      >
        <NewUserDialog />
      </PageHeader>
      <UsersList initialUsers={users || []} />
    </div>
  );
}
