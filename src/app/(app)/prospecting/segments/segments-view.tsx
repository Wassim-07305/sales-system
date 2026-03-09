"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Filter,
  Users,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Eye,
} from "lucide-react";
import {
  createSegment,
  updateSegment,
  deleteSegment,
  getSegmentProspects,
} from "@/lib/actions/segmentation";

// ─── Types ──────────────────────────────────────────────────────────

interface SegmentFilter {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "not_contains";
  value: string;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  filters: SegmentFilter[];
  color: string;
  created_at: string;
  updated_at: string;
}

interface SegmentStats {
  totalSegments: number;
  totalProspects: number;
  counts: Record<string, number>;
}

interface Prospect {
  id: string;
  name: string;
  status: string;
  platform: string;
  company?: string;
  created_at: string;
  last_message_at?: string | null;
  profile_url?: string | null;
}

interface Props {
  initialSegments: Segment[];
  initialStats: SegmentStats;
}

// ─── Constants ──────────────────────────────────────────────────────

const FILTER_FIELDS: { value: string; label: string }[] = [
  { value: "status", label: "Statut" },
  { value: "source", label: "Source / Plateforme" },
  { value: "company", label: "Entreprise" },
  { value: "temperature", label: "Temperature" },
  { value: "score", label: "Score" },
  { value: "created_at", label: "Date de creation" },
  { value: "last_contact", label: "Dernier contact" },
  { value: "tags", label: "Tags" },
];

const FILTER_OPERATORS: { value: string; label: string }[] = [
  { value: "eq", label: "Egal a" },
  { value: "neq", label: "Different de" },
  { value: "gt", label: "Superieur a" },
  { value: "lt", label: "Inferieur a" },
  { value: "contains", label: "Contient" },
  { value: "not_contains", label: "Ne contient pas" },
];

const SEGMENT_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#7af17a",
  "#3b82f6",
  "#8b5cf6",
  "#6b7280",
  "#ec4899",
  "#14b8a6",
];

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacte",
  replied: "Repondu",
  interested: "Interesse",
  booked: "RDV pris",
  converted: "Converti",
  lost: "Perdu",
};

// ─── Component ──────────────────────────────────────────────────────

export function SegmentsView({ initialSegments, initialStats }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [segments] = useState<Segment[]>(initialSegments);
  const [stats] = useState<SegmentStats>(initialStats);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);
  const [segmentProspects, setSegmentProspects] = useState<Record<string, Prospect[]>>({});
  const [loadingProspects, setLoadingProspects] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFilters, setFormFilters] = useState<SegmentFilter[]>([
    { field: "status", operator: "eq", value: "" },
  ]);
  const [formColor, setFormColor] = useState(SEGMENT_COLORS[0]);

  // ─── Handlers ───────────────────────────────────────────────────

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormFilters([{ field: "status", operator: "eq", value: "" }]);
    setFormColor(SEGMENT_COLORS[0]);
    setEditingSegment(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(segment: Segment) {
    setEditingSegment(segment);
    setFormName(segment.name);
    setFormDescription(segment.description || "");
    setFormFilters(
      segment.filters.length > 0
        ? segment.filters
        : [{ field: "status", operator: "eq", value: "" }]
    );
    setFormColor(segment.color);
    setDialogOpen(true);
  }

  function addFilterRow() {
    setFormFilters([...formFilters, { field: "status", operator: "eq", value: "" }]);
  }

  function removeFilterRow(index: number) {
    if (formFilters.length <= 1) return;
    setFormFilters(formFilters.filter((_, i) => i !== index));
  }

  function updateFilter(index: number, key: keyof SegmentFilter, val: string) {
    const updated = [...formFilters];
    updated[index] = { ...updated[index], [key]: val };
    setFormFilters(updated);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Le nom du segment est requis");
      return;
    }

    const validFilters = formFilters.filter((f) => f.value.trim() !== "");

    startTransition(async () => {
      try {
        if (editingSegment && !editingSegment.id.startsWith("demo-")) {
          await updateSegment(editingSegment.id, {
            name: formName,
            description: formDescription,
            filters: validFilters,
            color: formColor,
          });
          toast.success("Segment mis a jour");
        } else {
          await createSegment({
            name: formName,
            description: formDescription,
            filters: validFilters,
            color: formColor,
          });
          toast.success("Segment cree avec succes");
        }
        setDialogOpen(false);
        resetForm();
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de la sauvegarde"
        );
      }
    });
  }

  async function handleDelete(segment: Segment) {
    if (segment.id.startsWith("demo-")) {
      toast.error("Les segments de demo ne peuvent pas etre supprimes");
      return;
    }

    startTransition(async () => {
      try {
        await deleteSegment(segment.id);
        toast.success("Segment supprime");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    });
  }

  async function toggleProspects(segmentId: string) {
    if (expandedSegment === segmentId) {
      setExpandedSegment(null);
      return;
    }

    setExpandedSegment(segmentId);

    if (!segmentProspects[segmentId]) {
      setLoadingProspects(segmentId);
      try {
        const prospects = await getSegmentProspects(segmentId);
        setSegmentProspects((prev) => ({
          ...prev,
          [segmentId]: prospects as Prospect[],
        }));
      } catch {
        toast.error("Erreur lors du chargement des prospects");
      } finally {
        setLoadingProspects(null);
      }
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ─── Computed ───────────────────────────────────────────────────

  const totalSegmented = Object.values(stats.counts).reduce((a, b) => a + b, 0);

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segmentation intelligente"
        description="Organisez vos prospects en segments dynamiques pour un ciblage precis"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-[#7af17a] text-black hover:bg-[#5dd85d]">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau segment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>
                {editingSegment ? "Modifier le segment" : "Creer un segment"}
              </DialogTitle>
              <DialogDescription>
                Definissez les criteres pour regrouper automatiquement vos prospects.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="seg-name">Nom</Label>
                <Input
                  id="seg-name"
                  placeholder="Ex: Prospects chauds"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="seg-desc">Description</Label>
                <Input
                  id="seg-desc"
                  placeholder="Description du segment..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex gap-2">
                  {SEGMENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        formColor === color
                          ? "border-white scale-110"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormColor(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Filtres</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addFilterRow}
                    className="text-[#7af17a] hover:text-[#5dd85d]"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </div>

                <div className="space-y-2">
                  {formFilters.map((filter, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        value={filter.field}
                        onValueChange={(val) => updateFilter(index, "field", val)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FILTER_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(val) => updateFilter(index, "operator", val)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FILTER_OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        className="flex-1"
                        placeholder="Valeur..."
                        value={filter.value}
                        onChange={(e) => updateFilter(index, "value", e.target.value)}
                      />

                      {formFilters.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFilterRow(index)}
                          className="text-muted-foreground hover:text-red-400 px-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="bg-[#7af17a] text-black hover:bg-[#5dd85d]"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingSegment ? "Mettre a jour" : "Creer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#7af17a]/10">
                <Filter className="h-5 w-5 text-[#7af17a]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total segments</p>
                <p className="text-2xl font-bold">{stats.totalSegments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total prospects segmentes
                </p>
                <p className="text-2xl font-bold">{totalSegmented}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Prospects total (base)
                </p>
                <p className="text-2xl font-bold">{stats.totalProspects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segment cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {segments.map((segment) => {
          const count = stats.counts[segment.id] || 0;
          const isExpanded = expandedSegment === segment.id;
          const prospects = segmentProspects[segment.id];
          const isLoading = loadingProspects === segment.id;

          return (
            <Card key={segment.id} className="overflow-hidden">
              {/* Color indicator bar */}
              <div className="h-1" style={{ backgroundColor: segment.color }} />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: segment.color }}
                    />
                    <CardTitle className="text-base">{segment.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                      onClick={() => openEdit(segment)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                      onClick={() => handleDelete(segment)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {segment.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {segment.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {count} prospect{count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(segment.updated_at || segment.created_at)}
                  </span>
                </div>

                {/* Filters preview */}
                {segment.filters.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {segment.filters.map((f, i) => {
                      const fieldLabel = FILTER_FIELDS.find(
                        (ff) => ff.value === f.field
                      )?.label || f.field;
                      const opLabel = FILTER_OPERATORS.find(
                        (o) => o.value === f.operator
                      )?.label || f.operator;
                      return (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {fieldLabel} {opLabel} &quot;{f.value}&quot;
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Toggle prospects button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => toggleProspects(segment.id)}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {isExpanded ? "Masquer" : "Voir les prospects"}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </Button>

                {/* Expanded prospects list */}
                {isExpanded && (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {isLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Chargement...
                      </div>
                    ) : prospects && prospects.length > 0 ? (
                      prospects.map((prospect) => (
                        <div
                          key={prospect.id}
                          className="px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {prospect.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {prospect.platform}
                              {prospect.company ? ` - ${prospect.company}` : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">
                            {STATUS_LABELS[prospect.status] || prospect.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Aucun prospect dans ce segment
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {segments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Aucun segment configure
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Creez votre premier segment pour organiser vos prospects.
            </p>
            <Button
              onClick={openCreate}
              className="bg-[#7af17a] text-black hover:bg-[#5dd85d]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Creer un segment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
