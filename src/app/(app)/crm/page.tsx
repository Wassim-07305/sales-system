import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KanbanBoard } from "./kanban-board";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CrmExportButton } from "./crm-export-button";

export default async function CRMPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("position");

  const { data: deals } = await supabase
    .from("deals")
    .select("*, contact:profiles!deals_contact_id_fkey(*), assigned_user:profiles!deals_assigned_to_fkey(*)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Pipeline CRM"
        description="Gérez vos deals et suivez votre pipeline"
      >
        <CrmExportButton />
        <Button className="bg-brand text-brand-dark hover:bg-brand/90">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau deal
        </Button>
      </PageHeader>

      <KanbanBoard
        initialStages={stages || []}
        initialDeals={deals || []}
      />
    </div>
  );
}
