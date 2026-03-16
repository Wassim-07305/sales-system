import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAssignments,
  getUnassignedSetters,
} from "@/lib/actions/team-assignments";
import { PageHeader } from "@/components/layout/page-header";
import { AssignmentsBoard } from "./assignments-board";

export default async function AssignmentsPage() {
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

  const [assignments, unassignedSetters] = await Promise.all([
    getAssignments(),
    getUnassignedSetters(),
  ]);

  return (
    <div>
      <PageHeader
        title="Affectations"
        description="Liez vos setters B2C aux entreprises B2B"
      />
      <AssignmentsBoard
        initialAssignments={assignments}
        initialUnassigned={unassignedSetters}
      />
    </div>
  );
}
