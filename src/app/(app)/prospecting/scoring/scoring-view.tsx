"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Flame,
  Snowflake,
  Thermometer,
  Zap,
  BarChart3,
  RefreshCw,
  Loader2,
  Search,
  Users,
  Info,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { calculateProspectScore, recalculateAllScores } from "@/lib/actions/hub-setting";
import type { ScoreBreakdown, ScoreTier } from "@/lib/scoring";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────

interface ProspectScoreData {
  engagement_score: number;
  responsiveness_score: number;
  qualification_score: number;
  total_score: number;
  temperature: string;
  computed_at: string;
}

interface Prospect {
  id: string;
  name: string;
  platform: string;
  status: string;
  profile_url: string | null;
  created_at: string;
  updated_at?: string;
  last_message_at?: string | null;
  notes?: string | null;
  scores: ProspectScoreData | null;
  breakdown: ScoreBreakdown;
}

interface Props {
  prospects: Prospect[];
}

// ─── Constants ──────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacte",
  replied: "Repondu",
  interested: "Interesse",
  booked: "RDV pris",
  converted: "Converti",
  lost: "Perdu",
  not_interested: "Pas interesse",
};

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
};

const tierConfig: Record<ScoreTier, { label: string; color: string; badgeClass: string; icon: typeof Snowflake }> = {
  froid: {
    label: "Froid",
    color: "#3b82f6",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Snowflake,
  },
  tiede: {
    label: "Tiede",
    color: "#f59e0b",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Thermometer,
  },
  chaud: {
    label: "Chaud",
    color: "#f97316",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    icon: Flame,
  },
  brulant: {
    label: "Brulant",
    color: "#ef4444",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: Zap,
  },
};

// ─── Score factor definitions for the breakdown bars ────────────────

const scoreFactors = [
  { key: "statusScore" as const, label: "Statut", max: 30, color: "#7af17a" },
  { key: "engagementScore" as const, label: "Engagement", max: 15, color: "#3b82f6" },
  { key: "recencyScore" as const, label: "Recence", max: 15, color: "#8b5cf6" },
  { key: "notesScore" as const, label: "Notes", max: 10, color: "#f59e0b" },
  { key: "platformFitScore" as const, label: "Fit plateforme", max: 10, color: "#06b6d4" },
  { key: "behavioralScore" as const, label: "Comportemental", max: 15, color: "#ec4899" },
];

// ─── Component ──────────────────────────────────────────────────────

export function ScoringView({ prospects }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [recalculatingAll, setRecalculatingAll] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  // ── Computed stats ──
  const scores = prospects.map((p) => p.breakdown.total);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const tierCounts = useMemo(() => {
    const counts: Record<ScoreTier, number> = { froid: 0, tiede: 0, chaud: 0, brulant: 0 };
    prospects.forEach((p) => {
      counts[p.breakdown.tier]++;
    });
    return counts;
  }, [prospects]);

  // ── Distribution histogram data ──
  const distributionData = useMemo(() => {
    const buckets = [
      { range: "0-10", min: 0, max: 10, count: 0 },
      { range: "11-20", min: 11, max: 20, count: 0 },
      { range: "21-30", min: 21, max: 30, count: 0 },
      { range: "31-40", min: 31, max: 40, count: 0 },
      { range: "41-50", min: 41, max: 50, count: 0 },
      { range: "51-60", min: 51, max: 60, count: 0 },
      { range: "61-70", min: 61, max: 70, count: 0 },
      { range: "71-80", min: 71, max: 80, count: 0 },
      { range: "81-90", min: 81, max: 90, count: 0 },
      { range: "91-100", min: 91, max: 100, count: 0 },
    ];
    scores.forEach((s) => {
      const bucket = buckets.find((b) => s >= b.min && s <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [scores]);

  const filtered = prospects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Handlers ──
  async function handleRecalculateAll() {
    setRecalculatingAll(true);
    startTransition(async () => {
      try {
        const count = await recalculateAllScores();
        toast.success(`${count} score(s) recalcule(s)`);
        router.refresh();
      } catch {
        toast.error("Erreur lors du recalcul");
      } finally {
        setRecalculatingAll(false);
      }
    });
  }

  async function handleRecalculate(prospectId: string) {
    setRecalculating(prospectId);
    startTransition(async () => {
      try {
        const newScore = await calculateProspectScore(prospectId);
        toast.success(`Score recalcule : ${newScore}`);
        router.refresh();
      } catch {
        toast.error("Erreur lors du recalcul");
      } finally {
        setRecalculating(null);
      }
    });
  }

  function getBarColor(score: number): string {
    if (score >= 76) return "#ef4444";
    if (score >= 51) return "#f97316";
    if (score >= 26) return "#f59e0b";
    return "#3b82f6";
  }

  return (
    <div>
      <PageHeader
        title="Scoring avance des prospects"
        description="Evaluez et priorisez vos prospects avec un scoring multi-criteres"
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRules(!showRules)}
          >
            <Info className="h-4 w-4 mr-2" />
            {showRules ? "Masquer les regles" : "Regles de scoring"}
          </Button>
          <Button
            onClick={handleRecalculateAll}
            disabled={recalculatingAll}
            variant="outline"
          >
            {recalculatingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalculer tous les scores
          </Button>
        </div>
      </PageHeader>

      {/* ── Scoring Rules Explanation Card ── */}
      {showRules && (
        <Card className="mb-6 border-brand/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-5 w-5 text-brand" />
              Comment le score est calcule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#7af17a" }} />
                  <div>
                    <p className="font-medium">Statut du pipeline (30 pts max)</p>
                    <p className="text-muted-foreground">
                      Nouveau (4), Contacte (12), Repondu (20), Interesse (25), RDV pris (28), Converti (30)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#3b82f6" }} />
                  <div>
                    <p className="font-medium">Engagement existant (15 pts max)</p>
                    <p className="text-muted-foreground">
                      Base sur le score d&apos;engagement de la fiche prospect
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#8b5cf6" }} />
                  <div>
                    <p className="font-medium">Recence du dernier message (15 pts max)</p>
                    <p className="text-muted-foreground">
                      Hier (15), 3j (12), 7j (9), 14j (5), 30j (2), +30j (0)
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#f59e0b" }} />
                  <div>
                    <p className="font-medium">Profondeur des notes (10 pts max)</p>
                    <p className="text-muted-foreground">
                      Plus les notes sont detaillees, plus le score est eleve
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#06b6d4" }} />
                  <div>
                    <p className="font-medium">Fit plateforme (10 pts max)</p>
                    <p className="text-muted-foreground">
                      Bonus si le prospect est sur votre plateforme la plus performante
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#ec4899" }} />
                  <div>
                    <p className="font-medium">Score comportemental (15 pts max)</p>
                    <p className="text-muted-foreground">
                      Frequence des messages (8 pts) + profondeur de conversation (7 pts)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full mt-1.5 shrink-0 bg-destructive" />
                  <div>
                    <p className="font-medium">Penalite d&apos;inactivite (jusqu&apos;a -15 pts)</p>
                    <p className="text-muted-foreground">
                      Malus progressif pour les prospects inactifs depuis plus de 14 jours
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Niveaux de temperature :</p>
              <div className="flex flex-wrap gap-3">
                {(["froid", "tiede", "chaud", "brulant"] as ScoreTier[]).map((tier) => {
                  const cfg = tierConfig[tier];
                  const TierIcon = cfg.icon;
                  const ranges: Record<ScoreTier, string> = {
                    froid: "0-25",
                    tiede: "26-50",
                    chaud: "51-75",
                    brulant: "76-100",
                  };
                  return (
                    <Badge key={tier} className={`${cfg.badgeClass} gap-1`}>
                      <TierIcon className="h-3 w-3" />
                      {cfg.label} ({ranges[tier]})
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgScore}</p>
              <p className="text-xs text-muted-foreground">Score moyen</p>
            </div>
          </CardContent>
        </Card>
        {(["brulant", "chaud", "tiede", "froid"] as ScoreTier[]).map((tier) => {
          const cfg = tierConfig[tier];
          const TierIcon = cfg.icon;
          return (
            <Card key={tier}>
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${cfg.color}15` }}
                >
                  <TierIcon className="h-5 w-5" style={{ color: cfg.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tierCounts[tier]}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Score Distribution Chart ── */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribution des scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData}>
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={((value: any) => [`${Number(value || 0)} prospect(s)`, "Nombre"]) as any}
                  contentStyle={{ backgroundColor: "#14080e", border: "none", borderRadius: 8, color: "#fff" }}
                  labelStyle={{ color: "#ccc" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distributionData.map((entry) => {
                    const midScore = (entry.min + entry.max) / 2;
                    return (
                      <Cell key={entry.range} fill={getBarColor(midScore)} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un prospect..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* ── Scoring Table ── */}
      <Card>
        <CardContent className="p-0">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 p-4 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">Prospect</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-1">Tier</div>
            <div className="col-span-2">Plateforme / Statut</div>
            <div className="col-span-2">Dernier contact</div>
            <div className="col-span-2">Actions</div>
          </div>

          <div className="divide-y">
            {filtered.map((prospect) => {
              const { breakdown } = prospect;
              const cfg = tierConfig[breakdown.tier];
              const TierIcon = cfg.icon;
              const isExpanded = expandedId === prospect.id;

              return (
                <div key={prospect.id}>
                  {/* Main row */}
                  <div
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 items-center hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : prospect.id)}
                  >
                    {/* Name */}
                    <div className="sm:col-span-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
                        {prospect.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{prospect.name}</p>
                        {breakdown.decayPenalty < 0 && (
                          <p className="text-[10px] text-destructive">
                            Inactivite : {breakdown.decayPenalty} pts
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="sm:col-span-2 flex items-center gap-2">
                      <Progress
                        value={breakdown.total}
                        className={`h-2 flex-1 [&>div]:transition-all`}
                        style={{ ["--bar-color" as string]: cfg.color }}
                      />
                      <Badge className={`${cfg.badgeClass} text-xs min-w-[3rem] justify-center`}>
                        {breakdown.total}
                      </Badge>
                    </div>

                    {/* Tier */}
                    <div className="sm:col-span-1">
                      <Badge className={`${cfg.badgeClass} gap-1 text-xs`}>
                        <TierIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* Platform & Status */}
                    <div className="sm:col-span-2 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {platformLabels[prospect.platform] || prospect.platform}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {statusLabels[prospect.status] || prospect.status}
                      </Badge>
                    </div>

                    {/* Last contact */}
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      {prospect.scores?.computed_at
                        ? formatDistanceToNow(
                            new Date(prospect.scores.computed_at),
                            { addSuffix: true, locale: fr }
                          )
                        : prospect.updated_at
                        ? formatDistanceToNow(new Date(prospect.updated_at), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : formatDistanceToNow(new Date(prospect.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                    </div>

                    {/* Actions */}
                    <div className="sm:col-span-2 flex items-center gap-1 justify-end">
                      {/* Quick action based on tier */}
                      {(breakdown.tier === "froid" || breakdown.tier === "tiede") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info(`Relance programmee pour ${prospect.name}`);
                          }}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Relancer
                        </Button>
                      )}
                      {(breakdown.tier === "chaud" || breakdown.tier === "brulant") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2 border-brand/30 text-brand hover:bg-brand/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info(`Qualification lancee pour ${prospect.name}`);
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Qualifier
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecalculate(prospect.id);
                        }}
                        disabled={recalculating === prospect.id}
                        title="Recalculer le score"
                      >
                        {recalculating === prospect.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : prospect.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* ── Expanded score breakdown ── */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 bg-muted/30">
                      <div className="rounded-lg border p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                          Decomposition du score
                        </p>

                        {/* Stacked horizontal bar */}
                        <div className="mb-4">
                          <div className="flex h-6 rounded-full overflow-hidden bg-muted">
                            {scoreFactors.map((factor) => {
                              const value = breakdown[factor.key];
                              // Width as percentage of 100 (max possible score)
                              const widthPct = Math.max(0, value);
                              if (widthPct === 0) return null;
                              return (
                                <div
                                  key={factor.key}
                                  className="h-full flex items-center justify-center text-[10px] font-medium text-white transition-all"
                                  style={{
                                    width: `${widthPct}%`,
                                    backgroundColor: factor.color,
                                    minWidth: widthPct > 0 ? "12px" : "0",
                                  }}
                                  title={`${factor.label}: ${value}/${factor.max}`}
                                >
                                  {widthPct >= 5 ? value : ""}
                                </div>
                              );
                            })}
                            {breakdown.decayPenalty < 0 && (
                              <div
                                className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                                style={{
                                  width: `${Math.abs(breakdown.decayPenalty)}%`,
                                  backgroundColor: "#ef4444",
                                  minWidth: "12px",
                                }}
                                title={`Penalite inactivite: ${breakdown.decayPenalty}`}
                              >
                                {breakdown.decayPenalty}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Factor details */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {scoreFactors.map((factor) => {
                            const value = breakdown[factor.key];
                            const pct = Math.round((value / factor.max) * 100);
                            return (
                              <div key={factor.key} className="flex items-center gap-2">
                                <div
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: factor.color }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-xs truncate">{factor.label}</span>
                                    <span className="text-xs font-medium ml-1">
                                      {value}/{factor.max}
                                    </span>
                                  </div>
                                  <div className="h-1 rounded-full bg-muted mt-0.5">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: factor.color,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {breakdown.decayPenalty < 0 && (
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full shrink-0 bg-destructive" />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs truncate text-destructive">Penalite inactivite</span>
                                  <span className="text-xs font-medium ml-1 text-destructive">
                                    {breakdown.decayPenalty}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aucun prospect trouve
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
