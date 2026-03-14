import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, DollarSign } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DownloadPdfButton } from "./download-pdf-button";
import { ContractsExportButton } from "./contracts-export-button";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  signed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  expired: "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  signed: "Signé",
  expired: "Expiré",
};

export default async function ContractsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*, client:profiles(*)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Contrats"
        description="Gérez vos contrats et signatures"
      >
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
      </PageHeader>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Contrat</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contracts || []).map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="flex items-center gap-2 hover:underline font-medium"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Contrat #{contract.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {contract.client?.full_name || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-brand" />
                      {contract.amount?.toLocaleString("fr-FR") || "0"} €
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[contract.status]}
                    >
                      {statusLabels[contract.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(contract.created_at), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell>
                    <DownloadPdfButton contract={contract} />
                  </TableCell>
                </TableRow>
              ))}
              {(!contracts || contracts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                        <FileText className="h-7 w-7 opacity-50" />
                      </div>
                      <p className="font-medium">Aucun contrat</p>
                      <p className="text-sm mt-1">Créez votre premier contrat pour commencer.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
