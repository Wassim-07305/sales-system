"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileSpreadsheet,
  FileText,
  File,
  Loader2,
} from "lucide-react";
import {
  getExportColumns,
  getExportableData,
  type ExportColumn,
  type ExportType,
} from "@/lib/actions/export";
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export-utils";

type ExportFormat = "csv" | "xlsx" | "pdf";

interface ExportDialogProps {
  type: ExportType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "csv", label: "CSV", icon: <FileText className="h-4 w-4" /> },
  {
    value: "xlsx",
    label: "Excel (.xls)",
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  { value: "pdf", label: "PDF", icon: <File className="h-4 w-4" /> },
];

const TYPE_LABELS: Record<ExportType, string> = {
  contacts: "Contacts",
  deals: "Deals",
  bookings: "Rendez-vous",
  contracts: "Contrats",
};

const STATUS_OPTIONS: Record<ExportType, { value: string; label: string }[]> = {
  contacts: [
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "setter", label: "Setter" },
    { value: "closer", label: "Closer" },
    { value: "client_b2b", label: "Client B2B" },
    { value: "client_b2c", label: "Client B2C" },
  ],
  deals: [
    { value: "hot", label: "Chaud" },
    { value: "warm", label: "Tiède" },
    { value: "cold", label: "Froid" },
  ],
  bookings: [
    { value: "confirmed", label: "Confirmé" },
    { value: "completed", label: "Terminé" },
    { value: "no_show", label: "Absent" },
    { value: "cancelled", label: "Annulé" },
    { value: "rescheduled", label: "Replanifié" },
  ],
  contracts: [
    { value: "draft", label: "Brouillon" },
    { value: "sent", label: "Envoyé" },
    { value: "signed", label: "Signé" },
    { value: "expired", label: "Expiré" },
  ],
};

export function ExportDialog({ type, open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [columns, setColumns] = useState<ExportColumn[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  // Load columns when dialog opens or type changes
  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const cols = await getExportColumns(type);
      setColumns(cols);
      setSelectedKeys(new Set(cols.map((c) => c.key)));
    });
  }, [open, type]);

  function toggleColumn(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedKeys(new Set(columns.map((c) => c.key)));
  }

  function deselectAll() {
    setSelectedKeys(new Set());
  }

  function handleExport() {
    if (selectedKeys.size === 0) {
      toast.error("Sélectionnez au moins une colonne");
      return;
    }

    startTransition(async () => {
      try {
        const data = await getExportableData(type, {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          status:
            statusFilter && statusFilter !== "all" ? statusFilter : undefined,
        });

        if (data.length === 0) {
          toast.error("Aucune donnée à exporter");
          return;
        }

        const exportCols = columns.filter((c) => selectedKeys.has(c.key));
        const filename = `${TYPE_LABELS[type]}_export_${new Date().toISOString().slice(0, 10)}`;

        switch (format) {
          case "csv":
            exportToCSV(data, exportCols, filename);
            break;
          case "xlsx":
            exportToXLSX(data, exportCols, filename);
            break;
          case "pdf":
            exportToPDF(data, exportCols, filename);
            break;
        }

        toast.success(`Export ${format.toUpperCase()} téléchargé`);
        onOpenChange(false);
      } catch {
        toast.error("Erreur lors de l'export");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter {TYPE_LABELS[type]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Format selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Format</Label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={format === opt.value ? "default" : "outline"}
                  size="sm"
                  className={
                    format === opt.value
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : ""
                  }
                  onClick={() => setFormat(opt.value)}
                >
                  {opt.icon}
                  <span className="ml-1.5">{opt.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Column selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Colonnes ({selectedKeys.size}/{columns.length})
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-emerald-500 hover:underline"
                >
                  Tout
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Aucun
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 max-h-48 overflow-y-auto">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedKeys.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>

          {/* Date range filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Période{" "}
              <span className="text-muted-foreground font-normal">
                (optionnel)
              </span>
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Du"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Au"
                />
              </div>
            </div>
          </div>

          {/* Status filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Filtre{" "}
              <span className="text-muted-foreground font-normal">
                (optionnel)
              </span>
            </Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {STATUS_OPTIONS[type]?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={isPending || selectedKeys.size === 0}
            className="bg-emerald-500 text-black hover:bg-emerald-400"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exporter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
