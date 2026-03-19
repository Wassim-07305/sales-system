import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign } from "lucide-react";
import Link from "next/link";
import { ContractsExportButton } from "./contracts-export-button";
import { ContractsList } from "./contracts-list";

export default async function ContractsPage() {
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

  if (!profile) redirect("/dashboard");

  const isAdmin = ["admin", "manager"].includes(profile.role);
  const isClient = ["client_b2b", "client_b2c"].includes(profile.role);

  if (!isAdmin && !isClient) {
    redirect("/dashboard");
  }

  const query = supabase
    .from("contracts")
    .select("*, client:profiles(*)")
    .order("created_at", { ascending: false });

  if (isClient) {
    query.eq("client_id", user.id);
  }

  const { data: contracts } = await query;

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Contrats" : "Mes contrats"}
        description={
          isAdmin
            ? "Gérez vos contrats et signatures"
            : "Consultez et signez vos contrats"
        }
      >
        {isAdmin && (
          <div className="flex items-center gap-2">
            <ContractsExportButton />
            <Link href="/contracts/cash-flow">
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Cash Flow
              </Button>
            </Link>
            <Link href="/contracts/new">
              <Button className="bg-brand text-brand-dark hover:bg-brand/90">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau contrat
              </Button>
            </Link>
          </div>
        )}
      </PageHeader>

      <ContractsList contracts={contracts || []} />
    </div>
  );
}
