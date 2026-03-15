"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import {
  importContactsCSV,
  importDealsCSV,
  exportContactsCSV,
  exportDealsCSV,
} from "@/lib/actions/import-export";

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ImportExportDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [importType, setImportType] = useState<"contacts" | "deals">("contacts");
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const csvText = evt.target?.result as string;
      if (!csvText) return;

      startTransition(async () => {
        try {
          const res =
            importType === "contacts"
              ? await importContactsCSV(csvText)
              : await importDealsCSV(csvText);

          setResult(res);

          if (res.imported > 0) {
            toast.success(
              `${res.imported} ${importType === "contacts" ? "contact(s)" : "deal(s)"} importé(s)`
            );
          }
          if (res.errors.length > 0) {
            toast.error(`${res.errors.length} erreur(s) lors de l'import`);
          }
        } catch {
          toast.error("Erreur lors de l'import");
        }
      });
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleExportContacts() {
    startTransition(async () => {
      try {
        const csv = await exportContactsCSV();
        if (!csv) {
          toast.error("Aucune donnée à exporter");
          return;
        }
        downloadCSV(csv, "contacts_export.csv");
        toast.success("Export contacts téléchargé");
      } catch {
        toast.error("Erreur lors de l'export");
      }
    });
  }

  function handleExportDeals() {
    startTransition(async () => {
      try {
        const csv = await exportDealsCSV();
        if (!csv) {
          toast.error("Aucune donnée à exporter");
          return;
        }
        downloadCSV(csv, "deals_export.csv");
        toast.success("Export deals téléchargé");
      } catch {
        toast.error("Erreur lors de l'export");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import / Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Import / Export CSV</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="import">
          <TabsList className="w-full">
            <TabsTrigger value="import" className="flex-1">
              Importer
            </TabsTrigger>
            <TabsTrigger value="export" className="flex-1">
              Exporter
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Button
                variant={importType === "contacts" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setImportType("contacts");
                  setResult(null);
                }}
              >
                Contacts
              </Button>
              <Button
                variant={importType === "deals" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setImportType("deals");
                  setResult(null);
                }}
              >
                Deals
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              {importType === "contacts"
                ? "Colonnes attendues : full_name, email, phone, company, role, niche"
                : "Colonnes attendues : title, value, source, contact_email, temperature"}
            </p>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileImport}
                  disabled={isPending}
                />
                <div className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Choisir un fichier CSV
                </div>
              </label>
            </div>

            {result && (
              <div className="rounded-xl border border-border/50 p-3 space-y-2">
                <p className="text-sm font-medium text-green-600">
                  {result.imported} ligne(s) importée(s)
                </p>
                {result.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-600">
                      {result.errors.length} erreur(s) :
                    </p>
                    <ul className="text-xs text-red-500 max-h-32 overflow-y-auto space-y-0.5">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 pt-4">
            <div className="space-y-3">
              <Button
                onClick={handleExportContacts}
                disabled={isPending}
                className="w-full justify-start"
                variant="outline"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exporter Contacts (CSV)
              </Button>
              <Button
                onClick={handleExportDeals}
                disabled={isPending}
                className="w-full justify-start"
                variant="outline"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exporter Deals (CSV)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
