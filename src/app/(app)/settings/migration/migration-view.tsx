"use client";

import { useState, useTransition, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Database,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  History,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CRM_PRESETS,
  type CrmSource,
  type MigrationFieldMapping,
  type MigrationConfig,
  type MigrationResult,
  type MigrationLog,
} from "@/lib/migration-presets";
import { executeMigration } from "@/lib/actions/migration";

const steps = [
  { label: "Source CRM", icon: Database },
  { label: "Fichier CSV", icon: FileSpreadsheet },
  { label: "Mapping", icon: Settings2 },
  { label: "Résultat", icon: CheckCircle },
];

export function MigrationView({ history }: { history: MigrationLog[] }) {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<CrmSource>("hubspot");
  const [dataType, setDataType] = useState<"contacts" | "deals" | "both">(
    "contacts",
  );
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [mappings, setMappings] = useState<MigrationFieldMapping[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [mergeExisting, setMergeExisting] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Parse CSV file
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (!text) return;

        const delimiter = text.includes(";") ? ";" : ",";
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error(
            "Le fichier CSV doit contenir au moins un en-tête et une ligne de données",
          );
          return;
        }

        const headers = lines[0]
          .split(delimiter)
          .map((h) => h.trim().replace(/^"|"$/g, ""));
        setCsvHeaders(headers);

        const rows: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i]
            .split(delimiter)
            .map((v) => v.trim().replace(/^"|"$/g, ""));
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || "";
          });
          rows.push(row);
        }
        setCsvRows(rows);

        // Auto-generate mappings from preset
        const preset = CRM_PRESETS[source];
        const allPresetMappings = [
          ...(dataType !== "deals" ? preset.contactMappings : []),
          ...(dataType !== "contacts" ? preset.dealMappings : []),
        ];

        const autoMappings: MigrationFieldMapping[] = headers.map((header) => {
          const found = allPresetMappings.find(
            (m) => m.source.toLowerCase() === header.toLowerCase(),
          );
          return found || { source: header, target: "_ignore" };
        });

        setMappings(autoMappings);
        setStep(2);
      };
      reader.readAsText(file);
    },
    [source, dataType],
  );

  function updateMapping(index: number, target: string) {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, target } : m)),
    );
  }

  function handleExecute() {
    startTransition(async () => {
      try {
        const config: MigrationConfig = {
          source,
          dataType,
          mappings,
          options: {
            skipDuplicates,
            mergeExisting,
            defaultStage: "Prospect",
          },
        };

        const contactRows = dataType !== "deals" ? csvRows : [];
        const dealRows = dataType !== "contacts" ? csvRows : [];

        const res = await executeMigration(
          contactRows,
          dealRows,
          config,
          fileName,
        );
        setResult(res);
        setStep(3);
        toast.success("Migration terminée !");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erreur lors de la migration",
        );
      }
    });
  }

  const targetFields = [
    { value: "_ignore", label: "— Ignorer —" },
    { value: "first_name", label: "Prénom" },
    { value: "last_name", label: "Nom" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Téléphone" },
    { value: "company", label: "Entreprise" },
    { value: "position", label: "Poste" },
    { value: "source", label: "Source" },
    { value: "notes", label: "Notes" },
    { value: "tags", label: "Tags" },
    { value: "title", label: "Titre deal" },
    { value: "value", label: "Valeur deal" },
    { value: "stage_name", label: "Étape pipeline" },
    { value: "contact_email", label: "Email contact" },
    { value: "next_action_date", label: "Date prochaine action" },
    { value: "created_at", label: "Date de création" },
  ];

  return (
    <div>
      <PageHeader
        title="Migration CRM"
        description="Importez vos données depuis un autre CRM (HubSpot, Pipedrive, Salesforce)"
      >
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  i === step
                    ? "bg-emerald-500 text-black"
                    : i < step
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 0: Choose CRM source */}
      {step === 0 && (
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <Database className="h-4 w-4 text-emerald-500" />
                </div>
                Source CRM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(
                  Object.entries(CRM_PRESETS) as [
                    CrmSource,
                    typeof CRM_PRESETS.hubspot,
                  ][]
                ).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setSource(key)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      source === key
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-transparent bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <Database
                      className={cn(
                        "h-6 w-6 mx-auto mb-2",
                        source === key ? "text-emerald-500" : "text-muted-foreground",
                      )}
                    />
                    <p className="text-sm font-medium">{preset.label}</p>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Type de données
                </label>
                <Select
                  value={dataType}
                  onValueChange={(v) => setDataType(v as typeof dataType)}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contacts">
                      Contacts uniquement
                    </SelectItem>
                    <SelectItem value="deals">Deals uniquement</SelectItem>
                    <SelectItem value="both">Contacts + Deals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded border-border"
                  />
                  Ignorer les doublons (par email)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={mergeExisting}
                    onChange={(e) => setMergeExisting(e.target.checked)}
                    className="rounded border-border"
                  />
                  Fusionner avec les contacts existants
                </label>
              </div>

              <Button
                onClick={() => setStep(1)}
                className="bg-emerald-500 text-black hover:bg-emerald-400"
              >
                Continuer
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Upload CSV */}
      {step === 1 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              </div>
              Importer le fichier CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Exportez vos données depuis {CRM_PRESETS[source].label} au format
              CSV, puis importez-les ici. Les colonnes seront automatiquement
              mappées.
            </p>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Glissez un fichier CSV ou cliquez pour sélectionner
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="max-w-[300px] mx-auto"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
                <Settings2 className="h-4 w-4 text-purple-500" />
              </div>
              Mapping des colonnes ({csvRows.length} lignes détectées)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-6">
              {mappings.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-[200px] text-sm font-medium bg-muted px-3 py-1.5 rounded truncate">
                    {m.source}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Select
                    value={m.target}
                    onValueChange={(v) => updateMapping(i, v)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {m.target !== "_ignore" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateMapping(i, "_ignore")}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Preview first 3 rows */}
            {csvRows.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Aperçu (3 premières lignes)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {csvHeaders.slice(0, 6).map((h) => (
                          <th
                            key={h}
                            className="text-left p-2 font-medium truncate max-w-[120px]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b">
                          {csvHeaders.slice(0, 6).map((h) => (
                            <td
                              key={h}
                              className="p-2 truncate max-w-[120px] text-muted-foreground"
                            >
                              {row[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <Button
                onClick={handleExecute}
                disabled={isPending}
                className="bg-emerald-500 text-black hover:bg-emerald-400"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Lancer la migration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              Migration terminée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {(dataType === "contacts" || dataType === "both") && (
                <>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-2xl font-bold text-emerald-600">
                      {result.contactsImported}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contacts importés
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-2xl font-bold text-amber-600">
                      {result.contactsSkipped}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contacts ignorés (doublons)
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-2xl font-bold text-red-600">
                      {result.contactsErrors}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Erreurs contacts
                    </p>
                  </div>
                </>
              )}
              {(dataType === "deals" || dataType === "both") && (
                <>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-2xl font-bold text-emerald-600">
                      {result.dealsImported}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deals importés
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-2xl font-bold text-amber-600">
                      {result.dealsSkipped}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deals ignorés
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-2xl font-bold text-red-600">
                      {result.dealsErrors}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Erreurs deals
                    </p>
                  </div>
                </>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Erreurs ({result.errors.length})
                </p>
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      Ligne {err.row}: {err.message}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-xs text-muted-foreground font-medium">
                      ... et {result.errors.length - 20} autres erreurs
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep(0);
                  setResult(null);
                  setCsvRows([]);
                  setCsvHeaders([]);
                }}
              >
                Nouvelle migration
              </Button>
              <Link href="/utilisateurs">
                <Button
                  size="sm"
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  Voir les contacts
                </Button>
              </Link>
              <Link href="/crm">
                <Button size="sm" variant="outline">
                  Voir le CRM
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Migration History */}
      {history.length > 0 && step !== 3 && (
        <Card className="mt-8 overflow-hidden border-border/50">
          <CardHeader className="border-b border-border/30 bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                <History className="h-4 w-4 text-amber-500" />
              </div>
              Historique des migrations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/10">
                    <th className="text-left p-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Fichier
                    </th>
                    <th className="text-center p-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-right p-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Importés
                    </th>
                    <th className="text-right p-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Erreurs
                    </th>
                    <th className="text-right p-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 font-medium truncate max-w-[200px]">
                        {log.file_name || "—"}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {log.data_type}
                        </span>
                      </td>
                      <td className="p-4 text-right text-green-600 font-medium">
                        {log.contacts_imported + log.deals_imported}
                      </td>
                      <td className="p-4 text-right text-red-500">
                        {log.total_errors}
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
