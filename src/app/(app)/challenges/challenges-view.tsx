"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Progress component not used directly – custom animated bars instead
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trophy,
  Flame,
  Target,
  Clock,
  Medal,
  Star,
  Zap,
  CheckCircle2,
  BarChart3,
  Gift,
  Plus,
  Pencil,
  Trash2,
  History,
  Shield,
  Crown,
  Calendar,
  Users,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { LevelUpModal } from "./level-up-modal";
import { BadgesDisplay } from "./badges-display";
import { StreakDisplay } from "./streak-display";
import type { BadgeDefinition } from "@/lib/badge-definitions";
import {
  createChallenge,
  updateChallenge,
  deleteChallenge,
  notifyChallengeStart,
  type ChallengeFormData,
} from "@/lib/actions/gamification";

interface GamProfile {
  user_id: string;
  level: number;
  level_name: string;
  total_points: number;
  current_streak: number;
  badges: Array<{ badge_id: string; name: string; earned_at: string }>;
}

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  target_value: number;
  metric: string;
  points_reward: number;
  start_date: string | null;
  end_date: string | null;
  challenge_type?: string | null;
  recurrence?: string | null;
  is_active?: boolean;
}

interface PastChallenge extends Challenge {
  participants_count: number;
  completed_count: number;
  winner: { full_name: string | null; avatar_url: string | null } | null;
}

interface LeaderboardEntry {
  user_id: string;
  level: number;
  level_name: string;
  total_points: number;
  user: { full_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  gamProfile: GamProfile | null;
  challenges: Challenge[];
  progressMap: Record<string, { current_value: number; completed: boolean }>;
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
  allBadges: BadgeDefinition[];
  isAdmin: boolean;
  adminChallenges: Challenge[];
  pastChallenges: PastChallenge[];
}

const LEVELS = [
  { level: 1, name: "Setter Débutant", minPoints: 0, maxPoints: 99 },
  { level: 2, name: "Setter Confirmé", minPoints: 100, maxPoints: 299 },
  { level: 3, name: "Setter Senior", minPoints: 300, maxPoints: 599 },
  { level: 4, name: "Setter Elite", minPoints: 600, maxPoints: 999 },
  { level: 5, name: "Setter Légende", minPoints: 1000, maxPoints: 99999 },
];

const METRIC_OPTIONS = [
  { value: "deals", label: "Nombre de deals" },
  { value: "revenue", label: "Chiffre d'affaires (EUR)" },
  { value: "calls", label: "Appels effectués" },
  { value: "bookings", label: "Rendez-vous bookés" },
  { value: "dms_sent", label: "DMs envoyés" },
  { value: "replies", label: "Réponses reçues" },
  { value: "prospects", label: "Prospects ajoutés" },
  { value: "courses_completed", label: "Cours terminés" },
];

const RECURRENCE_OPTIONS = [
  { value: "once", label: "Unique" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
];

const EMPTY_FORM: ChallengeFormData = {
  title: "",
  description: "",
  type: "individual",
  metric: "deals",
  target_value: 10,
  start_date: new Date().toISOString().split("T")[0],
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  points_reward: 100,
  recurrence: "once",
};

// ---------------------------------------------------------------------------
// Confetti celebration overlay
// ---------------------------------------------------------------------------

function ConfettiCelebration({ onDone }: { onDone: () => void }) {
  const [particles] = useState(() => {
    const colors = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#7af17a"];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 2,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
      isRound: Math.random() > 0.5,
    }));
  });

  useEffect(() => {
    const timer = setTimeout(onDone, 3500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: p.isRound ? "50%" : "2px",
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin challenge form dialog
// ---------------------------------------------------------------------------

function ChallengeFormDialog({
  open,
  onOpenChange,
  initialData,
  editId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ChallengeFormData;
  editId?: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ChallengeFormData>(
    initialData || EMPTY_FORM,
  );
  const [isPending, startTransition] = useTransition();

  function handleChange(
    field: keyof ChallengeFormData,
    value: string | number,
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    if (form.target_value <= 0) {
      toast.error("L'objectif doit être supérieur à 0");
      return;
    }
    if (form.points_reward <= 0) {
      toast.error("La récompense doit être supérieure à 0");
      return;
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }

    startTransition(async () => {
      const result = editId
        ? await updateChallenge(editId, form)
        : await createChallenge(form);

      if (result.success) {
        toast.success(
          editId ? "Défi modifié avec succès" : "Défi créé avec succès",
        );
        // Notifier le début si c'est un nouveau challenge qui commence aujourd'hui ou avant
        if (!editId && new Date(form.start_date) <= new Date()) {
          // Fire and forget: on ne bloque pas la UI
          notifyChallengeStart("").catch(() => {});
        }
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || "Une erreur est survenue");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editId ? "Modifier le défi" : "Créer un nouveau défi"}
          </DialogTitle>
          <DialogDescription>
            {editId
              ? "Modifiez les paramètres du défi"
              : "Définissez un nouveau défi pour votre équipe"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Titre */}
          <div className="grid gap-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              placeholder="Ex: 10 deals cette semaine"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le défi..."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Type + Métrique */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  handleChange("type", v as "individual" | "team")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individuel</SelectItem>
                  <SelectItem value="team">Équipe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Métrique</Label>
              <Select
                value={form.metric}
                onValueChange={(v) => handleChange("metric", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Objectif + Points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="target">Objectif (valeur cible)</Label>
              <Input
                id="target"
                type="number"
                min={1}
                value={form.target_value}
                onChange={(e) =>
                  handleChange("target_value", parseInt(e.target.value) || 0)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="points">Récompense (points)</Label>
              <Input
                id="points"
                type="number"
                min={1}
                value={form.points_reward}
                onChange={(e) =>
                  handleChange("points_reward", parseInt(e.target.value) || 0)
                }
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start_date">Date de début</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => handleChange("start_date", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => handleChange("end_date", e.target.value)}
              />
            </div>
          </div>

          {/* Récurrence */}
          <div className="grid gap-2">
            <Label>Récurrence</Label>
            <Select
              value={form.recurrence}
              onValueChange={(v) =>
                handleChange("recurrence", v as "once" | "weekly" | "monthly")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((opt) => (
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
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? "Enregistrement..."
              : editId
                ? "Modifier"
                : "Créer le défi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Admin Panel
// ---------------------------------------------------------------------------

function AdminPanel({ adminChallenges }: { adminChallenges: Challenge[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editChallenge, setEditChallenge] = useState<Challenge | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEdit(challenge: Challenge) {
    setEditChallenge(challenge);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditChallenge(null);
    setDialogOpen(true);
  }

  function handleDelete(id: string, title: string) {
    if (
      !confirm(`Supprimer le défi "${title}" ? Cette action est irréversible.`)
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteChallenge(id);
      if (result.success) {
        toast.success("Défi supprimé");
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    });
  }

  const editFormData: ChallengeFormData | undefined = editChallenge
    ? {
        title: editChallenge.title,
        description: editChallenge.description || "",
        type:
          (editChallenge.challenge_type as "individual" | "team") ||
          "individual",
        metric: editChallenge.metric,
        target_value: editChallenge.target_value,
        start_date: editChallenge.start_date
          ? editChallenge.start_date.split("T")[0]
          : new Date().toISOString().split("T")[0],
        end_date: editChallenge.end_date
          ? editChallenge.end_date.split("T")[0]
          : new Date().toISOString().split("T")[0],
        points_reward: editChallenge.points_reward,
        recurrence:
          (editChallenge.recurrence as "once" | "weekly" | "monthly") || "once",
      }
    : undefined;

  return (
    <Card className="rounded-2xl border-border/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            Administration des défis
          </CardTitle>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau défi
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {adminChallenges.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            Aucun défi créé. Commencez par en créer un !
          </p>
        ) : (
          <div className="space-y-3">
            {adminChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">
                      {challenge.title}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        challenge.is_active
                          ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                          : "text-muted-foreground"
                      }
                    >
                      {challenge.is_active ? "Actif" : "Terminé"}
                    </Badge>
                    {challenge.challenge_type === "team" && (
                      <Badge
                        variant="outline"
                        className="text-blue-500 border-blue-500/30"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Équipe
                      </Badge>
                    )}
                    {challenge.recurrence &&
                      challenge.recurrence !== "once" && (
                        <Badge
                          variant="outline"
                          className="text-purple-500 border-purple-500/30"
                        >
                          {challenge.recurrence === "weekly"
                            ? "Hebdo"
                            : "Mensuel"}
                        </Badge>
                      )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {METRIC_OPTIONS.find((m) => m.value === challenge.metric)
                        ?.label || challenge.metric}
                    </span>
                    <span>Objectif: {challenge.target_value}</span>
                    <span>{challenge.points_reward} pts</span>
                    {challenge.start_date && challenge.end_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(challenge.start_date), "d MMM", {
                          locale: fr,
                        })}{" "}
                        →{" "}
                        {format(new Date(challenge.end_date), "d MMM yyyy", {
                          locale: fr,
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(challenge)}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(challenge.id, challenge.title)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ChallengeFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditChallenge(null);
          }}
          initialData={editFormData}
          editId={editChallenge?.id}
          onSuccess={() => {
            setEditChallenge(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------

function ChallengesHistory({
  pastChallenges,
}: {
  pastChallenges: PastChallenge[];
}) {
  const [filter, setFilter] = useState<"all" | "month" | "last_month">("all");

  const now = new Date();
  const filteredChallenges = pastChallenges.filter((c) => {
    if (filter === "all") return true;
    if (!c.end_date) return false;
    const endDate = new Date(c.end_date);
    if (filter === "month") {
      return (
        endDate.getMonth() === now.getMonth() &&
        endDate.getFullYear() === now.getFullYear()
      );
    }
    if (filter === "last_month") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        endDate.getMonth() === lastMonth.getMonth() &&
        endDate.getFullYear() === lastMonth.getFullYear()
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-emerald-500" />
          Historique des défis
        </h2>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "month" | "last_month")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="last_month">Mois dernier</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredChallenges.length === 0 ? (
        <Card className="rounded-2xl border-border/40">
          <CardContent className="p-12 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted/40 ring-1 ring-border/30 flex items-center justify-center mx-auto mb-3">
              <History className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="font-medium">Aucun défi terminé</p>
            <p className="text-sm mt-1 text-muted-foreground/60">
              Les défis terminés apparaîtront ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredChallenges.map((challenge) => (
            <Card
              key={challenge.id}
              className="rounded-2xl border-border/40 hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{challenge.title}</h3>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        Terminé
                      </Badge>
                    </div>
                    {challenge.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {challenge.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {challenge.start_date && challenge.end_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(challenge.start_date), "d MMM", {
                            locale: fr,
                          })}{" "}
                          →{" "}
                          {format(new Date(challenge.end_date), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </span>
                      )}
                      <span>
                        {challenge.participants_count} participant
                        {challenge.participants_count > 1 ? "s" : ""}
                      </span>
                      <span>
                        {challenge.completed_count} complété
                        {challenge.completed_count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shrink-0 ml-4">
                    <Zap className="h-3 w-3 mr-1" />
                    {challenge.points_reward} pts
                  </Badge>
                </div>

                {/* Gagnant */}
                {challenge.winner && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold">
                      {challenge.winner.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {challenge.winner.full_name || "Anonyme"}
                      </p>
                      <p className="text-xs text-muted-foreground">Gagnant</p>
                    </div>
                    <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                      <Trophy className="h-3 w-3 mr-1" />
                      Vainqueur
                    </Badge>
                  </div>
                )}

                {!challenge.winner && challenge.participants_count > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">
                      Aucun participant n&apos;a complété ce défi
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ChallengesView({
  gamProfile,
  challenges,
  progressMap,
  leaderboard,
  currentUserId,
  allBadges,
  isAdmin,
  adminChallenges,
  pastChallenges,
}: Props) {
  const [showLevelUp] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const previousProgressRef = useRef<Record<string, boolean>>({});

  const currentLevel =
    LEVELS.find((l) => l.level === (gamProfile?.level || 1)) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);
  const pointsInLevel =
    (gamProfile?.total_points || 0) - currentLevel.minPoints;
  const pointsNeeded = nextLevel
    ? nextLevel.minPoints - currentLevel.minPoints
    : 1;
  const levelProgress = nextLevel
    ? Math.round((pointsInLevel / pointsNeeded) * 100)
    : 100;
  const pointsRemaining = nextLevel
    ? nextLevel.minPoints - (gamProfile?.total_points || 0)
    : 0;

  // Animate XP progress bar on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(levelProgress), 100);
    return () => clearTimeout(timer);
  }, [levelProgress]);

  // Detect newly completed challenges and trigger confetti
  const handleConfettiDone = useCallback(() => setShowConfetti(false), []);

  useEffect(() => {
    const prev = previousProgressRef.current;
    let hasNew = false;
    for (const challenge of challenges) {
      const isCompleted = progressMap[challenge.id]?.completed;
      const wasCompleted = prev[challenge.id];
      if (isCompleted && !wasCompleted) {
        hasNew = true;
        toast.success(`Defi complete ! +${challenge.points_reward} points`, {
          icon: <Trophy className="h-5 w-5 text-emerald-500" />,
          style: { background: "#14080e", color: "#fff" },
          duration: 5000,
        });
      }
    }
    // Update ref for next render
    const next: Record<string, boolean> = {};
    for (const c of challenges) {
      next[c.id] = progressMap[c.id]?.completed || false;
    }
    previousProgressRef.current = next;
    // Schedule confetti outside synchronous effect to avoid cascading renders
    if (hasNew) {
      const raf = requestAnimationFrame(() => setShowConfetti(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [challenges, progressMap]);

  const activeChallenges = challenges.filter(
    (c) => !progressMap[c.id]?.completed,
  );
  const completedChallenges = challenges.filter(
    (c) => progressMap[c.id]?.completed,
  );

  return (
    <div>
      <PageHeader
        title="Défis & Gamification"
        description="Relevez des challenges et grimpez dans le classement"
      >
        <Link href="/challenges/rewards">
          <Button variant="outline" size="sm">
            <Gift className="h-4 w-4 mr-2" />
            Récompenses
          </Button>
        </Link>
        <Link href="/challenges/analytics">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </Link>
      </PageHeader>

      {/* Profile banner */}
      <Card className="mb-6 rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-950/80 text-white border-0 shadow-xl shadow-zinc-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              <Star className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">
                  {gamProfile?.level_name || "Setter Débutant"}
                </h2>
                <Badge className="bg-emerald-500 text-black">
                  Niv. {gamProfile?.level || 1}
                </Badge>
              </div>
              <p className="text-white/60 text-sm mb-2">
                {gamProfile?.total_points || 0} points au total
              </p>
              {nextLevel && (
                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>{gamProfile?.total_points || 0} pts</span>
                    <span>{nextLevel.minPoints} pts</span>
                  </div>
                  <div className="relative h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                      style={{ width: `${animatedProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Sparkles className="h-3 w-3 text-white/40" />
                    <span className="text-[11px] text-white/40">
                      {pointsRemaining} points restants pour{" "}
                      <span className="text-emerald-500 font-medium">{nextLevel.name}</span>
                    </span>
                  </div>
                </div>
              )}
              {!nextLevel && (
                <p className="text-xs text-emerald-500 font-medium mt-1">
                  Niveau maximum atteint !
                </p>
              )}
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                  <Flame className="h-5 w-5" />
                  <span className="text-2xl font-bold">
                    {gamProfile?.current_streak || 0}
                  </span>
                </div>
                <p className="text-xs text-white/50">Jours streak</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                  <Trophy className="h-5 w-5" />
                  <span className="text-2xl font-bold">
                    {completedChallenges.length}
                  </span>
                </div>
                <p className="text-xs text-white/50">Défis gagnés</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak + Badges section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <StreakDisplay
            currentStreak={gamProfile?.current_streak || 0}
            userId={currentUserId}
          />
        </div>
        <div className="lg:col-span-2">
          <BadgesDisplay
            allBadges={allBadges}
            earnedBadges={gamProfile?.badges || []}
            userId={currentUserId}
          />
        </div>
      </div>

      {/* Tabs: Défis / Historique / Admin */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">
            <Target className="h-4 w-4 mr-1.5" />
            Défis en cours
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1.5" />
            Historique
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin">
              <Shield className="h-4 w-4 mr-1.5" />
              Administration
            </TabsTrigger>
          )}
        </TabsList>

        {/* Active challenges tab */}
        <TabsContent value="active">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-500" />
                Défis en cours ({activeChallenges.length})
              </h2>
              {activeChallenges.map((challenge) => {
                const prog = progressMap[challenge.id];
                const current = prog?.current_value || 0;
                const percent =
                  challenge.target_value > 0
                    ? Math.round((current / challenge.target_value) * 100)
                    : 0;
                return (
                  <Card
                    key={challenge.id}
                    className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold mb-1">
                            {challenge.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {challenge.description}
                          </p>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shrink-0 ml-4">
                          <Zap className="h-3 w-3 mr-1" />
                          {challenge.points_reward} pts
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium">
                          {current}/{challenge.target_value}
                        </span>
                        {challenge.end_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(challenge.end_date), "d MMM", {
                              locale: fr,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="relative h-2.5 w-full rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {activeChallenges.length === 0 && (
                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-muted/40 ring-1 ring-border/30 flex items-center justify-center mx-auto mb-3">
                      <Target className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <p className="font-medium">Aucun défi en cours</p>
                    <p className="text-sm mt-1 text-muted-foreground/60">
                      De nouveaux défis arrivent bientôt !
                    </p>
                  </CardContent>
                </Card>
              )}

              {completedChallenges.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mt-6">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Défis complétés ({completedChallenges.length})
                  </h2>
                  {completedChallenges.map((challenge) => (
                    <Card
                      key={challenge.id}
                      className="rounded-2xl border-border/30 opacity-70"
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {challenge.title}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-emerald-500">
                          +{challenge.points_reward} pts
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>

            {/* Leaderboard */}
            <Card className="h-fit rounded-2xl border-border/40">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Medal className="h-5 w-5 text-emerald-500" />
                  Classement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((player, i) => {
                    const rank = i + 1;
                    const isMe = player.user_id === currentUserId;
                    return (
                      <div
                        key={player.user_id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isMe
                            ? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                            : rank <= 3
                              ? "bg-muted/50"
                              : ""
                        }`}
                      >
                        <span
                          className={`text-lg font-bold w-6 text-center ${
                            rank === 1
                              ? "text-yellow-500"
                              : rank === 2
                                ? "text-gray-400"
                                : rank === 3
                                  ? "text-orange-400"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {rank}
                        </span>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold">
                          {player.user?.full_name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {player.user?.full_name || "Anonyme"}{" "}
                            {isMe && "(vous)"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {player.level_name}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">
                          {player.total_points} pts
                        </span>
                      </div>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Pas encore de classement
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history">
          <ChallengesHistory pastChallenges={pastChallenges} />
        </TabsContent>

        {/* Admin tab */}
        {isAdmin && (
          <TabsContent value="admin">
            <AdminPanel adminChallenges={adminChallenges} />
          </TabsContent>
        )}
      </Tabs>

      {showLevelUp && gamProfile && (
        <LevelUpModal
          level={gamProfile.level}
          levelName={gamProfile.level_name}
        />
      )}

      {showConfetti && <ConfettiCelebration onDone={handleConfettiDone} />}
    </div>
  );
}
