"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { FileText, DollarSign, Filter } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DownloadPdfButton } from "./download-pdf-button";
import type { ContractPdfData } from "./[id]/contract-pdf";

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

export function ContractsList({ contracts }: { contracts: ContractPdfData[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = contracts;

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (periodFilter !== "all") {
      const now = new Date();
      let cutoff: Date;
      switch (periodFilter) {
        case "7d":
          cutoff = new Date(now.getTime() - 7 * 86400000);
          break;
        case "30d":
          cutoff = new Date(now.getTime() - 30 * 86400000);
          break;
        case "90d":
          cutoff = new Date(now.getTime() - 90 * 86400000);
          break;
        default:
          cutoff = new Date(0);
      }
      result = result.filter((c) => new Date(c.created_at) >= cutoff);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.client?.full_name?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [contracts, statusFilter, periodFilter, search]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
            <SelectItem value="signed">Signé</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="90d">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[200px] h-9"
        />
        {(statusFilter !== "all" || periodFilter !== "all" || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPeriodFilter("all");
              setSearch("");
            }}
          >
            Réinitialiser
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} contrat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <Card className="rounded-xl border-border/50 shadow-sm overflow-hidden">
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
              {filtered.map((contract) => (
                <TableRow
                  key={contract.id}
                  className="hover:bg-secondary/50 transition-colors"
                >
                  <TableCell>
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="flex items-center gap-2 hover:underline font-medium"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Contrat #{contract.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{contract.client?.full_name || "—"}</TableCell>
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center">
                      <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                        <FileText className="h-7 w-7 opacity-50" />
                      </div>
                      <p className="font-medium">Aucun contrat</p>
                      <p className="text-sm mt-1">
                        {contracts.length > 0
                          ? "Aucun contrat ne correspond aux filtres."
                          : "Créez votre premier contrat pour commencer."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
