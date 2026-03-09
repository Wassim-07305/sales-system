"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Table as TableIcon,
  Save,
  Download,
  Play,
  Plus,
  Trash2,
  ArrowUpDown,
  FolderOpen,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  executeCustomQuery,
  saveReport,
  deleteReport,
  type QueryConfig,
  type QueryFilter,
  type SavedReport,
} from "@/lib/actions/reports";

// ---------- Column definitions ----------

const TABLE_LABELS: Record<string, string> = {
  deals: "Deals",
  contacts: "Contacts",
  bookings: "Rendez-vous",
  contracts: "Contrats",
  calls: "Appels",
};

const TABLE_COLUMNS: Record<string, { key: string; label: string }[]> = {
  deals: [
    { key: "id", label: "ID" },
    { key: "name", label: "Nom" },
    { key: "value", label: "Valeur" },
    { key: "status", label: "Statut" },
    { key: "stage", label: "Etape" },
    { key: "setter_id", label: "Setter" },
    { key: "closer_id", label: "Closer" },
    { key: "created_at", label: "Date de creation" },
    { key: "updated_at", label: "Derniere modification" },
  ],
  contacts: [
    { key: "id", label: "ID" },
    { key: "first_name", label: "Prenom" },
    { key: "last_name", label: "Nom" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telephone" },
    { key: "company", label: "Entreprise" },
    { key: "position", label: "Poste" },
    { key: "source", label: "Source" },
    { key: "status", label: "Statut" },
    { key: "created_at", label: "Date de creation" },
  ],
  bookings: [
    { key: "id", label: "ID" },
    { key: "prospect_name", label: "Nom du prospect" },
    { key: "assigned_to", label: "Assigne a" },
    { key: "scheduled_at", label: "Date prevue" },
    { key: "duration_minutes", label: "Duree (min)" },
    { key: "status", label: "Statut" },
    { key: "created_at", label: "Date de creation" },
  ],
  contracts: [
    { key: "id", label: "ID" },
    { key: "deal_id", label: "Deal" },
    { key: "status", label: "Statut" },
    { key: "amount", label: "Montant" },
    { key: "start_date", label: "Date de debut" },
    { key: "end_date", label: "Date de fin" },
    { key: "created_at", label: "Date de creation" },
  ],
  calls: [
    { key: "id", label: "ID" },
    { key: "contact_id", label: "Contact" },
    { key: "user_id", label: "Utilisateur" },
    { key: "direction", label: "Direction" },
    { key: "duration", label: "Duree" },
    { key: "outcome", label: "Resultat" },
    { key: "notes", label: "Notes" },
    { key: "created_at", label: "Date de creation" },
  ],
};

const OPERATOR_LABELS: Record<string, string> = {
  eq: "egal a",
  neq: "different de",
  gt: "superieur a",
  lt: "inferieur a",
  gte: "superieur ou egal a",
  lte: "inferieur ou egal a",
  like: "contient",
};

// ---------- localStorage helpers ----------

const LS_KEY = "sales_system_saved_reports";

function getLocalReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function setLocalReports(reports: SavedReport[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(reports));
}

// ---------- CSV export ----------

function downloadCSV(data: Record<string, unknown>[], columns: string[]) {
  if (data.length === 0) return;
  const header = columns.join(";");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(";")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Component ----------

interface ReportsViewProps {
  initialSavedReports: SavedReport[];
  useLocalStorage: boolean;
}

export function ReportsView({ initialSavedReports, useLocalStorage }: ReportsViewProps) {
  // Query config state
  const [selectedTable, setSelectedTable] = useState<QueryConfig["table"]>("deals");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(["id", "name", "value", "status", "created_at"]);
  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [orderBy, setOrderBy] = useState<{ column: string; direction: "asc" | "desc" } | undefined>(undefined);
  const [limit, setLimit] = useState(100);

  // Results
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);

  // Saved reports
  const [savedReports, setSavedReports] = useState<SavedReport[]>(initialSavedReports);
  const [reportName, setReportName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadPanel, setShowLoadPanel] = useState(false);

  // Load localStorage reports if needed
  useEffect(() => {
    if (useLocalStorage && initialSavedReports.length === 0) {
      setSavedReports(getLocalReports());
    }
  }, [useLocalStorage, initialSavedReports]);

  // Reset columns when table changes
  const handleTableChange = useCallback((table: string) => {
    const t = table as QueryConfig["table"];
    setSelectedTable(t);
    const cols = TABLE_COLUMNS[t];
    // Select first few columns by default
    setSelectedColumns(cols.slice(0, Math.min(5, cols.length)).map((c) => c.key));
    setFilters([]);
    setOrderBy(undefined);
    setResults([]);
    setHasExecuted(false);
  }, []);

  const toggleColumn = useCallback((col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }, []);

  // Filter management
  const addFilter = useCallback(() => {
    const cols = TABLE_COLUMNS[selectedTable];
    setFilters((prev) => [
      ...prev,
      { column: cols[0].key, operator: "eq", value: "" },
    ]);
  }, [selectedTable]);

  const updateFilter = useCallback(
    (index: number, field: keyof QueryFilter, value: string) => {
      setFilters((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Execute query
  const handleExecute = useCallback(async () => {
    if (selectedColumns.length === 0) {
      toast.error("Selectionnez au moins une colonne");
      return;
    }

    setLoading(true);
    try {
      const config: QueryConfig = {
        table: selectedTable,
        columns: selectedColumns,
        filters: filters.filter((f) => f.value.trim() !== ""),
        orderBy,
        limit,
      };

      const result = await executeCustomQuery(config);
      if (result.error) {
        toast.error(result.error);
      } else {
        setResults(result.data);
        setTotalCount(result.totalCount);
        setHasExecuted(true);
        toast.success(`${result.totalCount} résultat${result.totalCount > 1 ? "s" : ""} trouvé${result.totalCount > 1 ? "s" : ""}`);
      }
    } catch {
      toast.error("Erreur lors de l'exécution de la requête");
    } finally {
      setLoading(false);
    }
  }, [selectedTable, selectedColumns, filters, orderBy, limit]);

  // Save report
  const handleSave = useCallback(async () => {
    if (!reportName.trim()) {
      toast.error("Veuillez saisir un nom pour le rapport");
      return;
    }

    const config: QueryConfig = {
      table: selectedTable,
      columns: selectedColumns,
      filters,
      orderBy,
      limit,
    };

    if (useLocalStorage) {
      const report: SavedReport = {
        id: crypto.randomUUID(),
        name: reportName,
        config,
        created_at: new Date().toISOString(),
        user_id: "",
      };
      const reports = [...getLocalReports(), report];
      setLocalReports(reports);
      setSavedReports(reports);
      toast.success("Rapport sauvegarde localement");
    } else {
      const result = await saveReport(reportName, config);
      if (result.useLocalStorage) {
        const report: SavedReport = {
          id: crypto.randomUUID(),
          name: reportName,
          config,
          created_at: new Date().toISOString(),
          user_id: "",
        };
        const reports = [...getLocalReports(), report];
        setLocalReports(reports);
        setSavedReports(reports);
        toast.success("Rapport sauvegarde localement");
      } else if (result.error) {
        toast.error(result.error);
        return;
      } else {
        toast.success("Rapport sauvegarde");
        // Refresh saved reports from server
        const { data } = await import("@/lib/actions/reports").then((m) => m.getSavedReports());
        setSavedReports(data);
      }
    }

    setReportName("");
    setShowSaveDialog(false);
  }, [reportName, selectedTable, selectedColumns, filters, orderBy, limit, useLocalStorage]);

  // Load report
  const handleLoad = useCallback((report: SavedReport) => {
    setSelectedTable(report.config.table);
    setSelectedColumns(report.config.columns);
    setFilters(report.config.filters);
    setOrderBy(report.config.orderBy);
    setLimit(report.config.limit || 100);
    setShowLoadPanel(false);
    setResults([]);
    setHasExecuted(false);
    toast.success(`Rapport "${report.name}" charge`);
  }, []);

  // Delete report
  const handleDelete = useCallback(
    async (id: string) => {
      if (useLocalStorage) {
        const reports = getLocalReports().filter((r) => r.id !== id);
        setLocalReports(reports);
        setSavedReports(reports);
        toast.success("Rapport supprime");
      } else {
        const result = await deleteReport(id);
        if (result.useLocalStorage) {
          const reports = getLocalReports().filter((r) => r.id !== id);
          setLocalReports(reports);
          setSavedReports(reports);
        } else if (result.error) {
          toast.error(result.error);
          return;
        }
        const { data } = await import("@/lib/actions/reports").then((m) => m.getSavedReports());
        if (data.length > 0) {
          setSavedReports(data);
        }
        toast.success("Rapport supprime");
      }
    },
    [useLocalStorage]
  );

  const availableColumns = TABLE_COLUMNS[selectedTable] || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports personnalises"
        description="Construisez des requetes personnalisees et exportez vos donnees"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLoadPanel(!showLoadPanel)}
        >
          <FolderOpen className="size-4 mr-2" />
          Rapports ({savedReports.length})
        </Button>
      </PageHeader>

      {/* Saved reports panel */}
      {showLoadPanel && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FolderOpen className="size-4" />
              Rapports sauvegardes
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowLoadPanel(false)}>
              <X className="size-4" />
            </Button>
          </div>
          {savedReports.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun rapport sauvegarde</p>
          ) : (
            <div className="space-y-2">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{report.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {TABLE_LABELS[report.config.table]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {report.config.columns.length} colonnes
                        {report.config.filters.length > 0 &&
                          ` · ${report.config.filters.length} filtre${report.config.filters.length > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => handleLoad(report)}>
                      Charger
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(report.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: query builder */}
        <div className="lg:col-span-1 space-y-4">
          {/* Source selector */}
          <Card className="p-4">
            <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
              <TableIcon className="size-4" />
              Source de donnees
            </Label>
            <Select value={selectedTable} onValueChange={handleTableChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* Column picker */}
          <Card className="p-4">
            <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Search className="size-4" />
              Colonnes
            </Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableColumns.map((col) => (
                <div key={col.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`col-${col.key}`}
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  <label
                    htmlFor={`col-${col.key}`}
                    className="text-sm cursor-pointer select-none"
                  >
                    {col.label}
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Filter className="size-4" />
                Filtres
              </Label>
              <Button variant="outline" size="sm" onClick={addFilter}>
                <Plus className="size-3 mr-1" />
                Ajouter
              </Button>
            </div>
            {filters.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun filtre applique</p>
            ) : (
              <div className="space-y-3">
                {filters.map((filter, index) => (
                  <div key={index} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Filtre {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeFilter(index)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                    <Select
                      value={filter.column}
                      onValueChange={(v) => updateFilter(index, "column", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col) => (
                          <SelectItem key={col.key} value={col.key}>
                            {col.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={filter.operator}
                      onValueChange={(v) => updateFilter(index, "operator", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Valeur..."
                      value={filter.value}
                      onChange={(e) => updateFilter(index, "value", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Sort & Limit */}
          <Card className="p-4">
            <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
              <ArrowUpDown className="size-4" />
              Tri et limite
            </Label>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Trier par</label>
                <Select
                  value={orderBy?.column || "__none__"}
                  onValueChange={(v) => {
                    if (v === "__none__") {
                      setOrderBy(undefined);
                    } else {
                      setOrderBy({ column: v, direction: orderBy?.direction || "desc" });
                    }
                  }}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Aucun tri" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun tri</SelectItem>
                    {availableColumns.map((col) => (
                      <SelectItem key={col.key} value={col.key}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {orderBy && (
                <div>
                  <label className="text-xs text-muted-foreground">Direction</label>
                  <Select
                    value={orderBy.direction}
                    onValueChange={(v) =>
                      setOrderBy({ ...orderBy, direction: v as "asc" | "desc" })
                    }
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascendant</SelectItem>
                      <SelectItem value="desc">Descendant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">
                  Limite (max 1000)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={limit}
                  onChange={(e) => setLimit(Math.min(1000, Math.max(1, Number(e.target.value) || 100)))}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleExecute} disabled={loading} className="w-full">
              <Play className="size-4 mr-2" />
              {loading ? "Execution..." : "Executer la requete"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="size-4 mr-2" />
                Sauvegarder
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={results.length === 0}
                onClick={() => downloadCSV(results, selectedColumns)}
              >
                <Download className="size-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
          </div>

          {/* Save dialog (inline) */}
          {showSaveDialog && (
            <Card className="p-4">
              <Label className="text-sm font-semibold mb-2 block">
                Nom du rapport
              </Label>
              <Input
                placeholder="Ex: Deals ce mois-ci..."
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleSave}>
                  Enregistrer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setReportName("");
                  }}
                >
                  Annuler
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right panel: results */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TableIcon className="size-4" />
                Resultats
                {hasExecuted && (
                  <Badge variant="secondary" className="ml-2">
                    {totalCount} ligne{totalCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </h3>
              {results.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCSV(results, selectedColumns)}
                >
                  <Download className="size-4 mr-1" />
                  CSV
                </Button>
              )}
            </div>

            {!hasExecuted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="size-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">
                  Configurez votre requete puis cliquez sur &quot;Executer la requete&quot;
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Filter className="size-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">
                  Aucun résultat pour cette requête
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {selectedColumns.map((col) => {
                        const colDef = availableColumns.find((c) => c.key === col);
                        return (
                          <TableHead key={col} className="text-xs font-semibold">
                            {colDef?.label || col}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {selectedColumns.map((col) => (
                          <TableCell key={col} className="text-xs">
                            {formatCellValue(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {hasExecuted && totalCount > results.length && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Affichage de {results.length} sur {totalCount} résultats.
                Augmentez la limite pour voir plus de données.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") {
    return value.toLocaleString("fr-FR");
  }
  const str = String(value);
  // Format ISO dates
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    try {
      return new Date(str).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return str;
    }
  }
  return str;
}
