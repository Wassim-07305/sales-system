"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  generateInvoice,
  generateScheduledInvoices,
} from "@/lib/actions/payments";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  FileText,
  DollarSign,
  Plus,
  Download,
  CalendarCheck,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Invoice {
  id: string;
  contract_id: string;
  client_id: string;
  amount: number;
  invoice_number: string;
  status: string;
  pdf_url: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  contract?: { id: string; amount: number; status: string } | null;
  client?: { id: string; full_name: string | null; email: string } | null;
}

interface Contract {
  id: string;
  amount: number;
  status: string;
  client?: { id: string; full_name: string | null } | null;
}

interface Props {
  invoices: Invoice[];
  contracts: Contract[];
}

const statusColors: Record<string, string> = {
  draft: "bg-muted/50 text-muted-foreground border-border/50",
  sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
};

export function InvoicesView({ invoices, contracts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isBulkPending, startBulkTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [amount, setAmount] = useState("");

  function handleGenerateInvoice() {
    if (!selectedContractId || !amount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    startTransition(async () => {
      try {
        const result = await generateInvoice(
          selectedContractId,
          parseFloat(amount),
        );
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Facture générée avec succès");
        setDialogOpen(false);
        setSelectedContractId("");
        setAmount("");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la génération de la facture");
      }
    });
  }

  function handleBulkGenerate() {
    startBulkTransition(async () => {
      try {
        const result = await generateScheduledInvoices();
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.count === 0) {
          toast.info("Tous les contrats ont déjà une facture ce mois-ci.");
        } else {
          toast.success(`${result.count} facture(s) générée(s) avec succès`);
          router.refresh();
        }
      } catch {
        toast.error("Erreur lors de la génération des factures");
      }
    });
  }

  // Auto-fill amount when contract is selected
  function handleContractSelect(contractId: string) {
    setSelectedContractId(contractId);
    const contract = contracts.find((c) => c.id === contractId);
    if (contract) {
      setAmount(String(contract.amount || ""));
    }
  }

  return (
    <div>
      <PageHeader title="Factures" description="Factures auto-générées">
        <Button
          variant="outline"
          onClick={handleBulkGenerate}
          disabled={isBulkPending}
        >
          <CalendarCheck className="h-4 w-4 mr-2" />
          {isBulkPending ? "Génération..." : "Générer les factures du mois"}
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-emerald-500 text-black hover:bg-emerald-400"
              disabled={contracts.length === 0}
              title={
                contracts.length === 0
                  ? "Créez d'abord un contrat signé"
                  : undefined
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Générer une facture
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Générer une facture</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Contrat</Label>
                <Select
                  value={selectedContractId}
                  onValueChange={handleContractSelect}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Sélectionner un contrat" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        #{contract.id.slice(0, 8)} —{" "}
                        {contract.client?.full_name || "Client"} (
                        {contract.amount?.toLocaleString("fr-FR")} &euro;)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Montant (&euro;)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <Button
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400 h-11 rounded-xl"
                onClick={handleGenerateInvoice}
                disabled={isPending}
              >
                {isPending ? "Génération..." : "Générer la facture"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card className="border-border/50 rounded-xl shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  N° Facture
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Contrat
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Client
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Montant
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Statut
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Échéance
                </TableHead>
                <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-right">
                  PDF
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="hover:bg-secondary/50 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {invoice.invoice_number}
                    </div>
                  </TableCell>
                  <TableCell>#{invoice.contract_id.slice(0, 8)}</TableCell>
                  <TableCell>{invoice.client?.full_name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      {invoice.amount.toLocaleString("fr-FR")} &euro;
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[invoice.status] || ""}
                    >
                      {statusLabels[invoice.status] || invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invoice.due_date
                      ? format(new Date(invoice.due_date), "d MMM yyyy", {
                          locale: fr,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!invoice.pdf_url}
                      onClick={() => {
                        if (invoice.pdf_url)
                          window.open(invoice.pdf_url, "_blank");
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="font-medium text-sm">Aucune facture</p>
                    <p className="text-xs mt-1">
                      Les factures apparaîtront ici une fois générées
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
