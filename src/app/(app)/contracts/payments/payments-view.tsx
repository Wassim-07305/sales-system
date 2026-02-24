"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { recordPayment } from "@/lib/actions/payments";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Installment {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  status: string;
  stripe_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  contract?: { id: string; client_id: string; amount: number; status: string } | null;
}

interface Props {
  installments: Installment[];
  overdue: Installment[];
}

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  paid: "Payé",
  pending: "En attente",
  overdue: "En retard",
  failed: "Échoué",
};

export function PaymentsView({ installments, overdue }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState("all");

  const totalDue = installments
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = overdue.reduce((sum, i) => sum + i.amount, 0);

  const filtered = installments.filter((i) => {
    if (filter === "all") return true;
    return i.status === filter;
  });

  function handleRecordPayment(installmentId: string) {
    startTransition(async () => {
      try {
        await recordPayment(installmentId);
        toast.success("Paiement enregistré avec succès");
        router.refresh();
      } catch {
        toast.error("Erreur lors de l'enregistrement du paiement");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Paiements"
        description="Suivi des paiements échelonnés"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {totalDue.toLocaleString("fr-FR")} &euro;
              </p>
              <p className="text-xs text-muted-foreground">Total dû</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {totalPaid.toLocaleString("fr-FR")} &euro;
              </p>
              <p className="text-xs text-muted-foreground">Total payé</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {totalOverdue.toLocaleString("fr-FR")} &euro;
              </p>
              <p className="text-xs text-muted-foreground">En retard</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue alerts */}
      {overdue.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Paiements en retard ({overdue.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdue.map((item) => (
              <Card key={item.id} className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Contrat #{item.contract_id.slice(0, 8)}
                    </span>
                    <Badge variant="outline" className="bg-red-100 text-red-700">
                      En retard
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-red-700">
                    {item.amount.toLocaleString("fr-FR")} &euro;
                  </p>
                  <p className="text-xs text-red-600">
                    Échéance : {format(new Date(item.due_date), "d MMM yyyy", { locale: fr })}
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 w-full bg-red-600 text-white hover:bg-red-700"
                    onClick={() => handleRecordPayment(item.id)}
                    disabled={isPending}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Marquer comme payé
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filter + Table */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Tous les paiements</h3>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="paid">Payé</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrat</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Payé le</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((installment) => (
                <TableRow key={installment.id}>
                  <TableCell className="font-medium">
                    Contrat #{installment.contract_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-brand" />
                      {installment.amount.toLocaleString("fr-FR")} &euro;
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(installment.due_date), "d MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[installment.status] || ""}
                    >
                      {statusLabels[installment.status] || installment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {installment.paid_at
                      ? format(new Date(installment.paid_at), "d MMM yyyy", { locale: fr })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {installment.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecordPayment(installment.id)}
                        disabled={isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Marquer payé
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucun paiement trouvé
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
