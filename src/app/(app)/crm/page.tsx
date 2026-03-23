import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { KanbanBoard } from "./kanban-board";
import { PageHeader } from "@/components/layout/page-header";
import { CrmExportButton } from "./crm-export-button";

export default async function CRMPage() {
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
    // B2B sees only deals from their assigned setters
    if (setterIds.length > 0) {
      dealsQuery = dealsQuery.in("assigned_to", setterIds);
    } else {
      // No setters assigned — show empty pipeline
      dealsQuery = dealsQuery.eq(
        "assigned_to",
        "00000000-0000-0000-0000-000000000000",
      );
    }
  } else if (!isAdmin) {
    // Setter/Closer: only their own deals
    dealsQuery = dealsQuery.eq("assigned_to", user.id);
  }
  // Admin/Manager: no filter — see all deals

  const { data: deals } = await dealsQuery;

  return (
    <div>
      <PageHeader
        title={isB2B ? "Pipeline de vos setters" : "HubCRM"}
        description={
          isB2B
            ? "Suivez les deals de tous vos setters assignés en temps réel"
            : "Gérez vos deals et suivez votre pipeline"
        }
      >
        <CrmExportButton />
      </PageHeader>

      {/* Tabs Pipeline / Prospection */}
      {!isB2B && (
        <div className="flex items-center gap-1 px-6 mb-4">
          <div className="inline-flex items-center rounded-lg bg-muted/40 border border-border/50 p-1">
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background text-foreground shadow-sm rounded-md">
              Pipeline
            </span>
            <Link
              href="/prospecting"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors"
            >
              Prospection
            </Link>
          </div>
        </div>
      )}

      <KanbanBoard
        initialStages={stages || []}
        initialDeals={deals || []}
        readOnly={isB2B}
        setterFilter={isB2B ? setterProfiles : undefined}
      />
    </div>
  );
}
