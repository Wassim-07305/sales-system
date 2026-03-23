import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KanbanBoard } from "../crm/kanban-board";
import { PageHeader } from "@/components/layout/page-header";
import { CrmExportButton } from "../crm/crm-export-button";

export default async function PipelinePage() {
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

  if (
    !profile ||
    !["admin", "manager", "setter", "closer", "client_b2b"].includes(
      profile.role,
    )
  ) {
    redirect("/dashboard");
  }

  const isB2B = profile.role === "client_b2b";
  const isAdmin = profile.role === "admin" || profile.role === "manager";

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("position");

  // For B2B: find all setters assigned to this entrepreneur
  let setterIds: string[] = [];
  let setterProfiles: { id: string; full_name: string | null }[] = [];

  if (isB2B) {
    const { data: assignedSetters } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "client_b2c")
      .eq("matched_entrepreneur_id", user.id);

    if (assignedSetters && assignedSetters.length > 0) {
      setterIds = assignedSetters.map((s) => s.id);
      setterProfiles = assignedSetters.map((s) => ({
        id: s.id,
        full_name: s.full_name,
      }));
    }
  }

  // Build the deals query based on role
  let dealsQuery = supabase
    .from("deals")
    .select(
      "*, contact:profiles!deals_contact_id_fkey(*), assigned_user:profiles!deals_assigned_to_fkey(*)",
    )
    .order("created_at", { ascending: false });

  if (isB2B) {
    if (setterIds.length > 0) {
      dealsQuery = dealsQuery.in("assigned_to", setterIds);
    } else {
      dealsQuery = dealsQuery.eq(
        "assigned_to",
        "00000000-0000-0000-0000-000000000000",
      );
    }
  } else if (!isAdmin) {
    dealsQuery = dealsQuery.eq("assigned_to", user.id);
  }

  const { data: deals } = await dealsQuery;

  return (
    <div>
      <PageHeader
        title={isB2B ? "Pipeline de vos setters" : "Pipeline"}
        description={
          isB2B
            ? "Suivez les deals de tous vos setters assignés en temps réel"
            : "Gérez vos deals et suivez votre pipeline"
        }
      >
        <CrmExportButton />
      </PageHeader>

      <KanbanBoard
        initialStages={stages || []}
        initialDeals={deals || []}
        readOnly={isB2B}
        setterFilter={isB2B ? setterProfiles : undefined}
      />
    </div>
  );
}
