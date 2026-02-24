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

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
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
        <Link href="/contracts/new">
          <Button className="bg-brand text-brand-dark hover:bg-brand/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrat
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrat</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
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
                </TableRow>
              ))}
              {(!contracts || contracts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun contrat
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
