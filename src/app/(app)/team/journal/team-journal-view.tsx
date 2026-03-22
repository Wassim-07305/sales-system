"use client";

import { useState, useTransition, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Phone,
  Handshake,
  DollarSign,
  Users,
  ArrowLeft,
  Trophy,
  Target,
  Loader2,
  Smile,
  Meh,
  Frown,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Percent,
} from "lucide-react";
import {
  getTeamJournals,
  getMissingEodSetters,
  getTeamJournalRange,
} from "@/lib/actions/gamification";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  dms_sent: number;
  replies_received: number;
  calls_booked: number;
  calls_completed: number;
  deals_closed: number;
  revenue_generated: number;
  mood: string;
  wins: string;
  blockers: string;
  plan_tomorrow: string;
  submitted_at: string;
  profile: Profile | null;
}

interface MissingSetter {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface SetterOption {
  id: string;
  full_name: string | null;
}

interface Props {
  journals: JournalEntry[];
  missingSetters: MissingSetter[];
  setters: SetterOption[];
}

const MOOD_MAP: Record<
  string,
  { label: string; icon: typeof Trophy; color: string }
> = {
  great: {
    label: "Excellent",
    icon: Trophy,
    color: "text-green-500 border-green-500 bg-green-500/10",
  },
  good: {
    label: "Bien",
    icon: ThumbsUp,
    color: "text-blue-500 border-blue-500 bg-blue-500/10",
  },
  neutral: {
    label: "Neutre",
    icon: Meh,
    color: "text-yellow-500 border-yellow-500 bg-yellow-500/10",
  },
  tough: {
    label: "Difficile",
    icon: Frown,
    color: "text-orange-500 border-orange-500 bg-orange-500/10",
  },
  bad: {
    label: "Mauvais",
    icon: ThumbsDown,
    color: "text-red-500 border-red-500 bg-red-500/10",
  },
};

function getMoodInfo(mood: string) {
  return MOOD_MAP[mood] || MOOD_MAP.neutral;
}

type PeriodPreset = "today" | "week" | "month" | "custom";

function getDateRange(preset: PeriodPreset): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { from: to, to };
    case "week": {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { from: weekAgo.toISOString().split("T")[0], to };
    }
    case "month": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: monthStart.toISOString().split("T")[0], to };
    }
    default:
      return { from: to, to };
  }
}

export function TeamJournalView({ journals, missingSetters, setters }: Props) {
  const [isPending, startTransition] = useTransition();
  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedSetter, setSelectedSetter] = useState("all");
  const [currentJournals, setCurrentJournals] = useState(journals);
  const [currentMissing, setCurrentMissing] = useState(missingSetters);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function fetchData(
    newPeriod: PeriodPreset,
    setterId: string,
    cFrom?: string,
    cTo?: string,
  ) {
    startTransition(async () => {
      const sid = setterId === "all" ? undefined : setterId;

      if (newPeriod === "today") {
        const today = new Date().toISOString().split("T")[0];
        const [j, m] = await Promise.all([
          getTeamJournals(today),
          getMissingEodSetters(today),
        ]);
        let filtered = j as JournalEntry[];
        if (sid) filtered = filtered.filter((e) => e.user_id === sid);
        setCurrentJournals(filtered);
        setCurrentMissing(m as MissingSetter[]);
      } else {
        const range =
          newPeriod === "custom" && cFrom && cTo
            ? { from: cFrom, to: cTo }
            : getDateRange(newPeriod);
        const j = await getTeamJournalRange(range.from, range.to, sid);
        setCurrentJournals(j as JournalEntry[]);
        setCurrentMissing([]);
      }
    });
  }

  function handlePeriodChange(value: PeriodPreset) {
    setPeriod(value);
    if (value !== "custom") {
      fetchData(value, selectedSetter);
    }
  }

  function handleSetterChange(value: string) {
    setSelectedSetter(value);
    fetchData(period, value, customFrom, customTo);
  }

  function handleCustomRange() {
    if (customFrom && customTo) {
      fetchData("custom", selectedSetter, customFrom, customTo);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Aggregate KPIs
  const stats = useMemo(() => {
    const count = currentJournals.length;
    if (count === 0)
      return {
        count: 0,
        totalDms: 0,
        totalReplies: 0,
        totalCalls: 0,
        totalDeals: 0,
        totalRevenue: 0,
        avgDms: 0,
        avgResponseRate: 0,
        uniqueDays: 0,
      };

    const totalDms = currentJournals.reduce((s, j) => s + (j.dms_sent || 0), 0);
    const totalReplies = currentJournals.reduce(
      (s, j) => s + (j.replies_received || 0),
      0,
    );
    const totalCalls = currentJournals.reduce(
      (s, j) => s + (j.calls_booked || 0),
      0,
    );
    const totalDeals = currentJournals.reduce(
      (s, j) => s + (j.deals_closed || 0),
      0,
    );
    const totalRevenue = currentJournals.reduce(
      (s, j) => s + (j.revenue_generated || 0),
      0,
    );
    const uniqueDays = new Set(currentJournals.map((j) => j.date)).size;
    const avgDms = uniqueDays > 0 ? Math.round(totalDms / uniqueDays) : 0;
    const avgResponseRate =
      totalDms > 0 ? Math.round((totalReplies / totalDms) * 100) : 0;

    return {
      count,
      totalDms,
      totalReplies,
      totalCalls,
      totalDeals,
      totalRevenue,
      avgDms,
      avgResponseRate,
      uniqueDays,
    };
  }, [currentJournals]);

  return (
    <div>
      <PageHeader
        title="Journal d'équipe"
        description="Vue d'ensemble des EOD de votre équipe"
      >
        <Link href="/team">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Équipe
          </Button>
        </Link>
      </PageHeader>

      {/* Missing setters alert */}
      {currentMissing.length > 0 && (
        <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-orange-500">
              {currentMissing.length} setter
              {currentMissing.length > 1 ? "s" : ""} n{"'"}ont pas soumis leur
              EOD aujourd{"'"}hui
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentMissing.map((setter) => (
              <Badge
                key={setter.id}
                variant="outline"
                className="border-orange-500/50 text-orange-400"
              >
                {setter.full_name || "Sans nom"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <Select
          value={period}
          onValueChange={(v) => handlePeriodChange(v as PeriodPreset)}
        >
          <SelectTrigger className="w-[180px]">
            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Aujourd{"'"}hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="custom">Personnalisé</SelectItem>
          </SelectContent>
        </Select>

        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-auto"
            />
            <span className="text-muted-foreground text-sm">à</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-auto"
            />
            <Button size="sm" variant="outline" onClick={handleCustomRange}>
              Appliquer
            </Button>
          </div>
        )}

        <Select value={selectedSetter} onValueChange={handleSetterChange}>
          <SelectTrigger className="w-[200px]">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les setters</SelectItem>
            {setters.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name || "Sans nom"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Aggregated KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" />
              Rapports soumis
            </div>
            <p className="text-2xl font-bold">{stats.count}</p>
            {stats.uniqueDays > 1 && (
              <p className="text-[10px] text-muted-foreground">
                sur {stats.uniqueDays} jours
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <MessageSquare className="h-3.5 w-3.5" />
              DMs envoyés
            </div>
            <p className="text-2xl font-bold">{stats.totalDms}</p>
            {stats.uniqueDays > 1 && (
              <p className="text-[10px] text-muted-foreground">
                moy. {stats.avgDms}/jour
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Percent className="h-3.5 w-3.5" />
              Taux de réponse
            </div>
            <p className="text-2xl font-bold">{stats.avgResponseRate}%</p>
            <p className="text-[10px] text-muted-foreground">
              {stats.totalReplies} réponses
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Phone className="h-3.5 w-3.5" />
              Calls bookés
            </div>
            <p className="text-2xl font-bold">{stats.totalCalls}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Handshake className="h-3.5 w-3.5" />
              Deals closés
            </div>
            <p className="text-2xl font-bold">{stats.totalDeals}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              CA généré
            </div>
            <p className="text-2xl font-bold text-emerald-500">
              {stats.totalRevenue.toLocaleString("fr-FR")} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Journal cards */}
      {currentJournals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucun EOD soumis pour cette période</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentJournals.map((journal) => {
            const moodInfo = getMoodInfo(journal.mood);
            const MoodIcon = moodInfo.icon;
            const isExpanded = expandedIds.has(journal.id);
            const responseRate =
              journal.dms_sent > 0
                ? Math.round(
                    (journal.replies_received / journal.dms_sent) * 100,
                  )
                : 0;

            return (
              <Card
                key={journal.id}
                className="border-border/50 hover:shadow-md transition-all duration-200"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-sm font-bold text-emerald-500 ring-1 ring-emerald-500/20">
                        {(journal.profile?.full_name || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {journal.profile?.full_name || "Utilisateur"}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {new Date(journal.date).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          ·{" "}
                          <span className="capitalize">
                            {journal.profile?.role || "setter"}
                          </span>
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", moodInfo.color)}
                    >
                      <MoodIcon className="h-3 w-3 mr-1" />
                      {moodInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* KPIs compact */}
                  <div className="grid grid-cols-4 gap-2 text-center my-3">
                    <div className="bg-muted/30 rounded-xl p-2.5 ring-1 ring-border/50">
                      <div className="text-base font-bold">
                        {journal.dms_sent}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        DMs
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-2.5 ring-1 ring-border/50">
                      <div className="text-base font-bold">{responseRate}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Taux rép.
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-2.5 ring-1 ring-border/50">
                      <div className="text-base font-bold">
                        {journal.calls_booked}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Appels
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-2.5 ring-1 ring-border/50">
                      <div className="text-base font-bold">
                        {journal.deals_closed}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Deals
                      </div>
                    </div>
                  </div>

                  {journal.revenue_generated > 0 && (
                    <div className="text-center text-sm font-semibold text-green-500 mb-2">
                      {journal.revenue_generated.toLocaleString("fr-FR")} € CA
                    </div>
                  )}

                  {/* Expandable section */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => toggleExpand(journal.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5 mr-1" />
                        Masquer les détails
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5 mr-1" />
                        Voir les détails
                      </>
                    )}
                  </Button>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                        <div>
                          <Smile className="h-3.5 w-3.5 mx-auto mb-0.5" />
                          {journal.replies_received} réponses
                        </div>
                        <div>
                          <Phone className="h-3.5 w-3.5 mx-auto mb-0.5" />
                          {journal.calls_completed} effectués
                        </div>
                        <div>
                          <DollarSign className="h-3.5 w-3.5 mx-auto mb-0.5" />
                          {journal.revenue_generated} €
                        </div>
                      </div>
                      {journal.wins && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center gap-1">
                            <Trophy className="h-3 w-3 text-green-500" />
                            Victoires
                          </p>
                          <p className="text-xs">{journal.wins}</p>
                        </div>
                      )}
                      {journal.blockers && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                            Blocages
                          </p>
                          <p className="text-xs">{journal.blockers}</p>
                        </div>
                      )}
                      {journal.plan_tomorrow && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center gap-1">
                            <Target className="h-3 w-3 text-blue-500" />
                            Plan demain
                          </p>
                          <p className="text-xs">{journal.plan_tomorrow}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
