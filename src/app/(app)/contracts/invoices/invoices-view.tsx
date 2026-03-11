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
import { generateInvoice } from "@/lib/actions/payments";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  FileText,
  DollarSign,
  Plus,
  Download,
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
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
};

export function InvoicesView({ invoices, contracts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
        await generateInvoice(selectedContractId, parseFloat(amount));
        toast.success("Facture générée avec succès");
        setDialogOpen(false);
        setSelectedContractId("");
        setAmount("");
        router.refresh();
      } catch (err) {
        toast.error("Erreur lors de la génération de la facture");
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
      <PageHeader
        title="Factures"
        description="Factures auto-générées"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand text-brand-dark hover:bg-brand/90">
              <Plus className="h-4 w-4 mr-2" />
              Générer une facture
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Générer une facture</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Contrat</Label>
                <Select value={selectedContractId} onValueChange={handleContractSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un contrat" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        #{contract.id.slice(0, 8)} — {contract.client?.full_name || "Client"} ({contract.amount?.toLocaleString("fr-FR")} &euro;)
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
                />
              </div>
              <Button
                className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                onClick={handleGenerateInvoice}
                disabled={isPending}
              >
                {isPending ? "Génération..." : "Générer la facture"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {invoice.invoice_number}
                    </div>
                  </TableCell>
                  <TableCell>
                    #{invoice.contract_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {invoice.client?.full_name || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-brand" />
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
                      ? format(new Date(invoice.due_date), "d MMM yyyy", { locale: fr })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!invoice.pdf_url}
                      onClick={() => {
                        if (invoice.pdf_url) window.open(invoice.pdf_url, "_blank");
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucune facture
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
