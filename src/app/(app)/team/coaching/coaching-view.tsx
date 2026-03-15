"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import {
  Target,
  TrendingUp,
  BookOpen,
  MessageSquare,
  Plus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Star,
  ExternalLink,
  Filter,
  BarChart3,
  GraduationCap,
  Phone,
  DollarSign,
  Handshake,
  Trash2,
  Send,
} from "lucide-react";
import {
  createObjective,
  updateObjectiveProgress,
  completeObjective,
  deleteObjective,
  createCoachingNote,
} from "@/lib/actions/coaching";
import type {
  CoachingObjective,
  DevelopmentPlan,
  CoachingNote,
} from "@/lib/actions/coaching";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────

interface Member {
  id: string;
  full_name: string | null;
  role: string;
}

interface Props {
  objectives: CoachingObjective[];
  developmentPlan: DevelopmentPlan;
  coachingNotes: CoachingNote[];
  members: Member[];
  userRole: string;
  userId: string;
}

// ─── Constants ──────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CoachingObjective["category"], string> = {
  calls: "Appels",
  deals: "Deals",
  revenue: "Chiffre d'affaires",
  skills: "Competences",
  other: "Autre",
};

const CATEGORY_ICONS: Record<CoachingObjective["category"], typeof Phone> = {
  calls: Phone,
  deals: Handshake,
  revenue: DollarSign,
  skills: GraduationCap,
  other: Target,
};

const STATUS_CONFIG: Record<
  CoachingObjective["status"],
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  in_progress: {
    label: "En cours",
    color: "bg-[#7af17a]/20 text-[#7af17a] border-[#7af17a]/30",
    icon: TrendingUp,
  },
  completed: {
    label: "Termine",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle,
  },
  at_risk: {
    label: "A risque",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: AlertTriangle,
  },
  overdue: {
    label: "En retard",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: XCircle,
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: "Haute", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  medium: { label: "Moyenne", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  low: { label: "Basse", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

// ─── Main Component ─────────────────────────────────────────────

export function CoachingView({
  objectives,
  developmentPlan,
  coachingNotes,
  members,
  userRole,
  userId,
}: Props) {
  const isManager = userRole === "admin" || userRole === "manager";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coaching"
        description="Objectifs, plan de developpement et notes de coaching"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Target}
          label="Objectifs actifs"
          value={objectives.filter((o) => o.status === "in_progress" || o.status === "at_risk").length}
          subLabel={`${objectives.filter((o) => o.status === "completed").length} termines`}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="A risque"
          value={objectives.filter((o) => o.status === "at_risk").length}
          subLabel="Necessitent attention"
          variant="warning"
        />
        <SummaryCard
          icon={BarChart3}
          label="Progression moyenne"
          value={`${objectives.length > 0 ? Math.round(objectives.reduce((acc, o) => acc + (o.currentValue / o.targetValue) * 100, 0) / objectives.length) : 0}%`}
          subLabel="Tous objectifs"
        />
        <SummaryCard
          icon={MessageSquare}
          label="Sessions coaching"
          value={coachingNotes.length}
          subLabel="Notes recues"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="objectives" className="space-y-4">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="objectives" className="data-[state=active]:bg-[#7af17a]/20 data-[state=active]:text-[#7af17a]">
            <Target className="w-4 h-4 mr-2" />
            Objectifs SMART
          </TabsTrigger>
          <TabsTrigger value="development" className="data-[state=active]:bg-[#7af17a]/20 data-[state=active]:text-[#7af17a]">
            <TrendingUp className="w-4 h-4 mr-2" />
            Plan de developpement
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-[#7af17a]/20 data-[state=active]:text-[#7af17a]">
            <BookOpen className="w-4 h-4 mr-2" />
            Notes de coaching
          </TabsTrigger>
        </TabsList>

        <TabsContent value="objectives">
          <ObjectivesTab
            objectives={objectives}
            members={members}
            isManager={isManager}
            userId={userId}
          />
        </TabsContent>

        <TabsContent value="development">
          <DevelopmentTab plan={developmentPlan} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab
            notes={coachingNotes}
            members={members}
            isManager={isManager}
            userId={userId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Summary Card ───────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  subLabel,
  variant = "default",
}: {
  icon: typeof Target;
  label: string;
  value: number | string;
  subLabel: string;
  variant?: "default" | "warning";
}) {
  return (
    <Card className="border-border/50 hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <div
            className={`h-9 w-9 rounded-xl flex items-center justify-center ring-1 ${
              variant === "warning"
                ? "bg-orange-500/10 ring-orange-500/20"
                : "bg-brand/10 ring-brand/20"
            }`}
          >
            <Icon
              className={`w-4 h-4 ${
                variant === "warning" ? "text-orange-400" : "text-brand"
              }`}
            />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>
      </CardContent>
    </Card>
  );
}

// ─── Objectives Tab ─────────────────────────────────────────────

function ObjectivesTab({
  objectives,
  members,
  isManager,
  userId,
}: {
  objectives: CoachingObjective[];
  members: Member[];
  isManager: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingProgress, setEditingProgress] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState<string>("");
  const [progressNote, setProgressNote] = useState("");

  // New objective form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<CoachingObjective["category"]>("calls");
  const [newTargetValue, setNewTargetValue] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");

  const filtered =
    categoryFilter === "all"
      ? objectives
      : objectives.filter((o) => o.category === categoryFilter);

  function resetForm() {
    setNewTitle("");
    setNewDescription("");
    setNewCategory("calls");
    setNewTargetValue("");
    setNewTargetDate("");
    setNewAssigneeId("");
  }

  function handleCreate() {
    if (!newTitle || !newTargetValue || !newTargetDate) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    startTransition(async () => {
      try {
        await createObjective({
          title: newTitle,
          description: newDescription,
          category: newCategory,
          targetValue: Number(newTargetValue),
          targetDate: newTargetDate,
          assigneeId: newAssigneeId || undefined,
        });
        toast.success("Objectif cree avec succes");
        setDialogOpen(false);
        resetForm();
        router.refresh();
      } catch {
        toast.error("Erreur lors de la creation de l'objectif");
      }
    });
  }

  function handleUpdateProgress(id: string) {
    if (!progressValue) return;
    startTransition(async () => {
      try {
        await updateObjectiveProgress(id, Number(progressValue), progressNote || undefined);
        toast.success("Progression mise a jour");
        setEditingProgress(null);
        setProgressValue("");
        setProgressNote("");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la mise a jour");
      }
    });
  }

  function handleComplete(id: string) {
    startTransition(async () => {
      try {
        await completeObjective(id);
        toast.success("Objectif marque comme termine");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la completion");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteObjective(id);
        toast.success("Objectif supprime");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-background border-border text-foreground">
              <SelectValue placeholder="Toutes categories" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">Toutes categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvel objectif
        </Button>
      </div>

      {/* Objectives List */}
      {filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun objectif trouve</p>
            <p className="text-sm text-muted-foreground mt-1">
              Creez votre premier objectif SMART pour commencer
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((obj) => {
            const statusCfg = STATUS_CONFIG[obj.status];
            const StatusIcon = statusCfg.icon;
            const CatIcon = CATEGORY_ICONS[obj.category];
            const pct = Math.min(
              100,
              Math.round((obj.currentValue / obj.targetValue) * 100)
            );
            const isEditing = editingProgress === obj.id;

            return (
              <Card
                key={obj.id}
                className="bg-card border-border hover:border-border transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-muted mt-0.5">
                          <CatIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {obj.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {obj.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`${statusCfg.color} text-xs`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-border text-muted-foreground text-xs"
                        >
                          {CATEGORY_LABELS[obj.category]}
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {obj.currentValue} / {obj.targetValue}
                        </span>
                        <span className="font-medium text-foreground">{pct}%</span>
                      </div>
                      <Progress
                        value={pct}
                        className="h-2 bg-muted"
                      />
                    </div>

                    {/* Date + Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          Echeance :{" "}
                          {new Date(obj.targetDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {obj.status !== "completed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-[#7af17a] hover:bg-[#7af17a]/10 h-8 text-xs"
                              onClick={() => {
                                setEditingProgress(isEditing ? null : obj.id);
                                setProgressValue(String(obj.currentValue));
                                setProgressNote("");
                              }}
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Mettre a jour
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 h-8 text-xs"
                              onClick={() => handleComplete(obj.id)}
                              disabled={isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Terminer
                            </Button>
                          </>
                        )}
                        {isManager && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 h-8 text-xs"
                            onClick={() => handleDelete(obj.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Inline Progress Update */}
                    {isEditing && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder="Nouvelle valeur"
                            value={progressValue}
                            onChange={(e) => setProgressValue(e.target.value)}
                            className="bg-input border-border text-foreground h-9"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Note (optionnel)"
                            value={progressNote}
                            onChange={(e) => setProgressNote(e.target.value)}
                            className="bg-input border-border text-foreground h-9"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateProgress(obj.id)}
                          disabled={isPending}
                          className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 h-9"
                        >
                          {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Sauvegarder"
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Notes */}
                    {obj.notes.length > 0 && (
                      <div className="pt-2 border-t border-border space-y-1">
                        {obj.notes.slice(-2).map((note, i) => (
                          <p
                            key={i}
                            className="text-xs text-muted-foreground pl-3 border-l-2 border-border"
                          >
                            {note}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Objective Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-popover border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Nouvel objectif SMART
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Titre *</Label>
              <Input
                placeholder="Ex: Atteindre 50 appels par semaine"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Description</Label>
              <Textarea
                placeholder="Decrivez l'objectif en detail..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-input border-border text-foreground resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Categorie *</Label>
                <Select
                  value={newCategory}
                  onValueChange={(v) =>
                    setNewCategory(v as CoachingObjective["category"])
                  }
                >
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Valeur cible *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  value={newTargetValue}
                  onChange={(e) => setNewTargetValue(e.target.value)}
                  className="bg-input border-border text-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Date cible *</Label>
                <Input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="bg-input border-border text-foreground"
                />
              </div>
              {isManager && members.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Assigner a</Label>
                  <Select
                    value={newAssigneeId}
                    onValueChange={setNewAssigneeId}
                  >
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue placeholder="Moi-meme" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value={userId}>Moi-meme</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name || "Sans nom"} ({m.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isPending}
                className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 font-semibold"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Creer l&apos;objectif
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Development Plan Tab ───────────────────────────────────────

function DevelopmentTab({ plan }: { plan: DevelopmentPlan }) {
  return (
    <div className="space-y-6">
      {/* Skills Assessment */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#7af17a]" />
            Evaluation des competences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plan.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune competence evaluee pour le moment.</p>
          ) : (
          <>
          <div className="space-y-4">
            {plan.skills.map((skill) => {
              const levelPct = (skill.level / 10) * 100;
              const targetPct = (skill.target / 10) * 100;
              return (
                <div key={skill.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{skill.name}</span>
                    <span className="text-muted-foreground">
                      {skill.level}/10{" "}
                      <span className="text-[#7af17a]">
                        (objectif : {skill.target})
                      </span>
                    </span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    {/* Target marker */}
                    <div
                      className="absolute top-0 h-full border-r-2 border-dashed border-[#7af17a]/50 z-10"
                      style={{ left: `${targetPct}%` }}
                    />
                    {/* Current level bar */}
                    <div
                      className={`h-full rounded-full transition-all ${
                        skill.level >= skill.target
                          ? "bg-emerald-500"
                          : skill.level >= skill.target - 2
                          ? "bg-[#7af17a]"
                          : "bg-orange-400"
                      }`}
                      style={{ width: `${levelPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded bg-[#7af17a]" />
              <span>Niveau actuel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded border-r-2 border-dashed border-[#7af17a]/50" />
              <span>Objectif</span>
            </div>
          </div>
          </>
          )}
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-[#7af17a]" />
            Actions recommandees
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plan.actions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune action recommandee pour le moment.</p>
          ) : (
          <div className="space-y-3">
            {plan.actions.map((action) => {
              const priorityCfg = PRIORITY_CONFIG[action.priority];
              return (
                <div
                  key={action.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    action.done
                      ? "bg-emerald-500/5 border-emerald-500/20 opacity-60"
                      : "bg-muted border-border"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      action.done
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {action.done && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium text-sm ${
                          action.done
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }`}
                      >
                        {action.title}
                      </span>
                      {priorityCfg && (
                        <Badge
                          variant="outline"
                          className={`${priorityCfg.color} text-[10px] px-1.5 py-0`}
                        >
                          {priorityCfg.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Resources */}
      {plan.resources.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#7af17a]" />
              Ressources recommandees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plan.resources.map((resource, i) => (
                <a
                  key={i}
                  href={resource.url}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border hover:border-[#7af17a]/30 hover:bg-[#7af17a]/5 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#7af17a]/10 group-hover:bg-[#7af17a]/20">
                    <GraduationCap className="w-4 h-4 text-[#7af17a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {resource.title}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {resource.type}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-[#7af17a] shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Notes Tab ──────────────────────────────────────────────────

function NotesTab({
  notes,
  members,
  isManager,
  userId,
}: {
  notes: CoachingNote[];
  members: Member[];
  isManager: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteRating, setNoteRating] = useState<number>(0);
  const [noteMemberId, setNoteMemberId] = useState("");

  function handleCreateNote() {
    if (!noteContent) {
      toast.error("Veuillez saisir le contenu de la note");
      return;
    }
    const memberId = noteMemberId || userId;
    startTransition(async () => {
      try {
        await createCoachingNote({
          memberId,
          content: noteContent,
          rating: noteRating > 0 ? noteRating : undefined,
        });
        toast.success("Note de coaching ajoutee");
        setDialogOpen(false);
        setNoteContent("");
        setNoteRating(0);
        setNoteMemberId("");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la creation de la note");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {isManager && (
        <div className="flex justify-end">
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle note
          </Button>
        </div>
      )}

      {/* Notes Timeline */}
      {notes.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune note de coaching</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isManager
                ? "Ajoutez une note apres chaque session de coaching"
                : "Les notes de vos sessions apparaitront ici"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

          {notes.map((note) => (
            <div key={note.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Timeline dot */}
              <div className="relative z-10 mt-1">
                <div className="w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center">
                  {note.managerAvatar ? (
                    <img
                      src={note.managerAvatar}
                      alt={note.managerName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {note.managerName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Note Card */}
              <Card className="flex-1 bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">
                        {note.managerName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.sessionDate).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                    {note.rating !== null && note.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < note.rating!
                                ? "text-amber-400 fill-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-popover border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Nouvelle note de coaching
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {members.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Membre</Label>
                <Select value={noteMemberId} onValueChange={setNoteMemberId}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue placeholder="Selectionner un membre" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name || "Sans nom"} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Contenu de la note *</Label>
              <Textarea
                placeholder="Points abordes, axes d'amelioration, points positifs..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="bg-input border-border text-foreground resize-none"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Evaluation de la session</Label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNoteRating(i + 1)}
                    className="p-0.5 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        i < noteRating
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground/30 hover:text-muted-foreground/60"
                      }`}
                    />
                  </button>
                ))}
                {noteRating > 0 && (
                  <button
                    type="button"
                    onClick={() => setNoteRating(0)}
                    className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDialogOpen(false);
                  setNoteContent("");
                  setNoteRating(0);
                  setNoteMemberId("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateNote}
                disabled={isPending}
                className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 font-semibold"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
