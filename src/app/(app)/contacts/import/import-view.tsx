"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  History,
} from "lucide-react";
import { toast } from "sonner";
import {
  validateImportData,
  executeImport,
  type ImportLog,
  type ImportValidationError,
  type ValidatedRow,
} from "@/lib/actions/import";

// --- CSV Parsing ---

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] || "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const delimiter = detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

// --- Auto-mapping ---

const CONTACT_FIELD_OPTIONS = [
  { value: "first_name", label: "Prénom" },
  { value: "last_name", label: "Nom" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Téléphone" },
  { value: "company", label: "Entreprise" },
  { value: "position", label: "Poste" },
  { value: "source", label: "Source" },
  { value: "tags", label: "Tags" },
  { value: "notes", label: "Notes" },
];

const AUTO_MAP: Record<string, string> = {
  prenom: "first_name",
  prénom: "first_name",
  firstname: "first_name",
  first_name: "first_name",
  "first name": "first_name",
  nom: "last_name",
  lastname: "last_name",
  last_name: "last_name",
  "last name": "last_name",
  name: "last_name",
  email: "email",
  "e-mail": "email",
  mail: "email",
  courriel: "email",
  telephone: "phone",
  téléphone: "phone",
  tel: "phone",
  tél: "phone",
  phone: "phone",
  mobile: "phone",
  portable: "phone",
  entreprise: "company",
  company: "company",
  société: "company",
  societe: "company",
  organization: "company",
  organisation: "company",
  poste: "position",
  position: "position",
  titre: "position",
  title: "position",
  "job title": "position",
  fonction: "position",
  source: "source",
  origine: "source",
  tags: "tags",
  etiquettes: "tags",
  étiquettes: "tags",
  notes: "notes",
  commentaire: "notes",
  commentaires: "notes",
  description: "notes",
};

function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    const match = AUTO_MAP[normalized];
    if (match && !usedFields.has(match)) {
      mapping[header] = match;
      usedFields.add(match);
    } else {
      mapping[header] = "";
    }
  }

  return mapping;
}

// --- Component ---

interface ImportViewProps {
  importHistory: ImportLog[];
}

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = [
  { step: 1, label: "Fichier" },
  { step: 2, label: "Mapping" },
  { step: 3, label: "Validation" },
  { step: 4, label: "Import" },
] as const;

export function ImportView({ importHistory }: ImportViewProps) {
  const [step, setStep] = useState<Step>(1);
  const [importType] = useState<"contacts" | "deals">("contacts");
  const [fileName, setFileName] = useState<string>("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validRows, setValidRows] = useState<ValidatedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    ImportValidationError[]
  >([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: File upload
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Veuillez sélectionner un fichier CSV");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0 || rows.length === 0) {
        toast.error("Le fichier CSV est vide ou invalide");
        return;
      }

      setCsvHeaders(headers);
      setCsvRows(rows);
      setMapping(autoDetectMapping(headers));
      toast.success(`${rows.length} lignes détectées`);
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Step 2: Mapping
  const updateMapping = (csvCol: string, targetField: string) => {
    setMapping((prev) => ({ ...prev, [csvCol]: targetField }));
  };

  // Step 3: Validation
  const runValidation = async () => {
    const result = await validateImportData(csvRows, mapping, importType);
    setValidRows(result.valid);
    setValidationErrors(result.errors);
  };

  // Step 4: Execute Import
  const runImport = async () => {
    setImporting(true);
    setImportProgress(10);

    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 5, 90));
    }, 300);

    try {
      const result = await executeImport(csvRows, mapping, importType, {
        skipDuplicates,
        fileName,
      });

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);

      if (result.imported > 0) {
        toast.success(
          `${result.imported} ${importType === "contacts" ? "contacts" : "deals"} importés avec succès`,
        );
      }
      if (result.errors > 0) {
        toast.error(`${result.errors} erreurs pendant l'import`);
      }
    } catch {
      clearInterval(progressInterval);
      toast.error("Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  const goToStep = async (target: Step) => {
    if (target === 3 && step === 2) {
      await runValidation();
    }
    setStep(target);
  };

  const reset = () => {
    setStep(1);
    setFileName("");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setValidRows([]);
    setValidationErrors([]);
    setImportResult(null);
    setImportProgress(0);
    setShowOnlyErrors(false);
  };

  // --- Rendering ---

  const mappedFieldCount = Object.values(mapping).filter(
    (v) => v !== "",
  ).length;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map(({ step: s, label }, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === s
                  ? "bg-[#7af17a]/20 text-[#7af17a] border border-[#7af17a]/30"
                  : step > s
                    ? "bg-[#7af17a]/10 text-[#7af17a]/60"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <span className="size-4 flex items-center justify-center text-xs font-bold">
                  {s}
                </span>
              )}
              <span className="hidden sm:inline">{label}</span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div className="w-6 h-px bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5" />
              Sélectionner un fichier CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-[#7af17a]/50 hover:bg-[#7af17a]/5 transition-colors duration-200"
            >
              <FileSpreadsheet className="size-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-base font-medium mb-1">
                Glissez-déposez votre fichier CSV ici
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou cliquez pour parcourir
              </p>
              {fileName && (
                <Badge variant="secondary" className="text-sm">
                  {fileName}
                </Badge>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            {csvRows.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {csvHeaders.length} colonnes
                    </Badge>
                    <Badge variant="outline">{csvRows.length} lignes</Badge>
                  </div>
                </div>

                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <p className="text-sm font-medium px-4 py-2 bg-muted/50">
                    Aperçu (5 premières lignes)
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {csvHeaders.map((h) => (
                            <TableHead key={h}>{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvRows.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            {csvHeaders.map((h) => (
                              <TableCell key={h} className="max-w-48 truncate">
                                {row[h] || "—"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => goToStep(2)}>
                    Suivant
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="size-5 rotate-90" />
              Mapper les colonnes
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Associez chaque colonne CSV à un champ contact. {mappedFieldCount}{" "}
              sur {csvHeaders.length} colonnes mappées.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {csvHeaders.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{header}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ex: {csvRows[0]?.[header] || "—"}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                  <div className="w-48">
                    <Select
                      value={mapping[header] || "none"}
                      onValueChange={(val) =>
                        updateMapping(header, val === "none" ? "" : val)
                      }
                    >
                      <SelectTrigger className="w-full h-11 rounded-xl">
                        <SelectValue placeholder="Ignorer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Ignorer —</SelectItem>
                        {CONTACT_FIELD_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4 mr-2" />
                Retour
              </Button>
              <Button
                onClick={() => goToStep(3)}
                disabled={mappedFieldCount === 0}
              >
                Valider les données
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Validation */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5" />
              Résultats de la validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-[#7af17a]/5 border-[#7af17a]/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="size-4 text-[#7af17a]" />
                  <span className="text-sm font-medium">Valides</span>
                </div>
                <p className="text-2xl font-bold text-[#7af17a]">
                  {validRows.length}
                </p>
              </div>
              <div
                className={`p-4 rounded-lg border ${
                  validationErrors.length > 0
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="size-4 text-red-500" />
                  <span className="text-sm font-medium">Erreurs</span>
                </div>
                <p className="text-2xl font-bold text-red-500">
                  {validationErrors.length}
                </p>
              </div>
              <div className="p-4 rounded-xl border bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total lignes</span>
                </div>
                <p className="text-2xl font-bold">{csvRows.length}</p>
              </div>
            </div>

            {/* Error details */}
            {validationErrors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    Détails des erreurs
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOnlyErrors(!showOnlyErrors)}
                  >
                    {showOnlyErrors
                      ? "Afficher tout"
                      : "Afficher uniquement les erreurs"}
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Ligne</TableHead>
                        <TableHead>Champ</TableHead>
                        <TableHead>Erreur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationErrors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant="destructive" className="font-mono">
                              #{err.row}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {err.field}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {err.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Valid rows preview */}
            {!showOnlyErrors && validRows.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">
                  Aperçu des lignes valides ({validRows.length})
                </h3>
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.values(mapping)
                          .filter((v) => v !== "")
                          .map((field) => {
                            const opt = CONTACT_FIELD_OPTIONS.find(
                              (f) => f.value === field,
                            );
                            return (
                              <TableHead key={field}>
                                {opt?.label || field}
                              </TableHead>
                            );
                          })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(mapping)
                            .filter((v) => v !== "")
                            .map((field) => (
                              <TableCell
                                key={field}
                                className="max-w-40 truncate"
                              >
                                {row[field] || "—"}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="size-4 mr-2" />
                Retour au mapping
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={validRows.length === 0}
              >
                Continuer vers l&apos;import
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5" />
              Lancer l&apos;import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!importResult ? (
              <>
                {/* Summary before import */}
                <div className="p-4 rounded-xl border bg-muted/50 space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">{validRows.length}</span>{" "}
                    lignes valides prêtes à être importées en tant que{" "}
                    <span className="font-medium">
                      {importType === "contacts" ? "contacts" : "deals"}
                    </span>
                    .
                  </p>
                  {validationErrors.length > 0 && (
                    <p className="text-sm text-amber-500">
                      {validationErrors.length} lignes avec erreurs seront
                      ignorées.
                    </p>
                  )}
                </div>

                {/* Options */}
                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="skip-duplicates"
                    checked={skipDuplicates}
                    onCheckedChange={(checked) =>
                      setSkipDuplicates(checked === true)
                    }
                  />
                  <label
                    htmlFor="skip-duplicates"
                    className="text-sm cursor-pointer"
                  >
                    Ignorer les doublons (email/téléphone)
                  </label>
                </div>

                {/* Progress */}
                {importing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Import en cours...
                      </span>
                      <span className="font-medium">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    disabled={importing}
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    Retour
                  </Button>
                  <Button
                    onClick={runImport}
                    disabled={importing}
                    className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Import en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="size-4 mr-2" />
                        Importer {validRows.length} lignes
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Results */}
                <div className="text-center py-6 space-y-4">
                  <CheckCircle2 className="size-16 mx-auto text-[#7af17a]" />
                  <h2 className="text-xl font-bold">Import terminé</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border bg-[#7af17a]/5 border-[#7af17a]/20 text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      Importés
                    </p>
                    <p className="text-3xl font-bold text-[#7af17a]">
                      {importResult.imported}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      Ignorés (doublons)
                    </p>
                    <p className="text-3xl font-bold text-amber-500">
                      {importResult.skipped}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border bg-red-500/5 border-red-500/20 text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      Erreurs
                    </p>
                    <p className="text-3xl font-bold text-red-500">
                      {importResult.errors}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button onClick={reset} variant="outline">
                    Nouvel import
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      {importHistory.length > 0 && step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" />
              Historique des imports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Importés</TableHead>
                  <TableHead className="text-right">Ignorés</TableHead>
                  <TableHead className="text-right">Erreurs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium max-w-40 truncate">
                      {log.file_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {log.type === "contacts" ? "Contacts" : "Deals"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[#7af17a]">
                      {log.imported}
                    </TableCell>
                    <TableCell className="text-right text-amber-500">
                      {log.skipped}
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {log.errors}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
