"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
import { createPaymentCheckout } from "@/lib/actions/stripe";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
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
  contract?: {
    id: string;
    client_id: string;
    amount: number;
    status: string;
  } | null;
}

interface Props {
  installments: Installment[];
  overdue: Installment[];
}

const statusColors: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
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

  function handlePayOnline(installmentId: string) {
    startTransition(async () => {
      try {
        const { url } = await createPaymentCheckout(installmentId);
        if (url) {
          window.location.href = url;
        }
      } catch {
        toast.error("Erreur lors de la creation du paiement en ligne");
      }
    });
  }

  function handleRecordPayment(installmentId: string) {
    startTransition(async () => {
      try {
        const result = await recordPayment(installmentId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
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
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center">
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
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {totalPaid.toLocaleString("fr-FR")} &euro;
              </p>
              <p className="text-xs text-muted-foreground">Total payé</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center">
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
              <Card key={item.id} className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Contrat #{item.contract_id.slice(0, 8)}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-red-500/10 text-red-600 border-red-500/20"
                    >
                      En retard
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-red-500">
                    {item.amount.toLocaleString("fr-FR")} &euro;
                  </p>
                  <p className="text-xs text-red-600">
                    Échéance :{" "}
                    {format(new Date(item.due_date), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-red-600 text-white hover:bg-red-700"
                      onClick={() => handlePayOnline(item.id)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <CreditCard className="h-3 w-3 mr-1" />
                      )}
                      Payer en ligne
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRecordPayment(item.id)}
                      disabled={isPending}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                  </div>
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
          <SelectTrigger className="w-44 h-11 rounded-xl text-xs">
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

      <Card className="rounded-xl border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Contrat
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Montant
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Échéance
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Statut
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Payé le
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((installment) => (
                <TableRow
                  key={installment.id}
                  className="hover:bg-secondary/50 transition-colors"
                >
                  <TableCell className="font-medium">
                    Contrat #{installment.contract_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      {installment.amount.toLocaleString("fr-FR")} &euro;
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(installment.due_date), "d MMM yyyy", {
                      locale: fr,
                    })}
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
                      ? format(new Date(installment.paid_at), "d MMM yyyy", {
                          locale: fr,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {installment.status !== "paid" && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handlePayOnline(installment.id)}
                          disabled={isPending}
                          className="bg-emerald-500 text-black hover:bg-emerald-400"
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <CreditCard className="h-3 w-3 mr-1" />
                          )}
                          Payer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecordPayment(installment.id)}
                          disabled={isPending}
                          title="Marquer comme paye manuellement"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="font-medium text-sm">Aucun paiement trouvé</p>
                    <p className="text-xs mt-1">
                      Les paiements apparaîtront ici
                    </p>
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
