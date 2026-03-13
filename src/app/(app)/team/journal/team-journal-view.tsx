"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { getTeamJournals, getMissingEodSetters } from "@/lib/actions/gamification";
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

interface Props {
  journals: JournalEntry[];
  missingSetters: MissingSetter[];
}

const MOOD_MAP: Record<string, { label: string; icon: typeof Trophy; color: string }> = {
  great: { label: "Excellent", icon: Trophy, color: "text-green-500 border-green-500 bg-green-500/10" },
  good: { label: "Bien", icon: ThumbsUp, color: "text-blue-500 border-blue-500 bg-blue-500/10" },
  neutral: { label: "Neutre", icon: Meh, color: "text-yellow-500 border-yellow-500 bg-yellow-500/10" },
  tough: { label: "Difficile", icon: Frown, color: "text-orange-500 border-orange-500 bg-orange-500/10" },
  bad: { label: "Mauvais", icon: ThumbsDown, color: "text-red-500 border-red-500 bg-red-500/10" },
};

function getMoodInfo(mood: string) {
  return MOOD_MAP[mood] || MOOD_MAP.neutral;
}

export function TeamJournalView({ journals, missingSetters }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [currentJournals, setCurrentJournals] = useState(journals);
  const [currentMissing, setCurrentMissing] = useState(missingSetters);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    startTransition(async () => {
      const [j, m] = await Promise.all([
        getTeamJournals(newDate),
        getMissingEodSetters(newDate),
      ]);
      setCurrentJournals(j as JournalEntry[]);
      setCurrentMissing(m as MissingSetter[]);
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Aggregate stats
  const totalDms = currentJournals.reduce((s, j) => s + (j.dms_sent || 0), 0);
  const totalCalls = currentJournals.reduce((s, j) => s + (j.calls_booked || 0), 0);
  const totalDeals = currentJournals.reduce((s, j) => s + (j.deals_closed || 0), 0);
  const totalRevenue = currentJournals.reduce((s, j) => s + (j.revenue_generated || 0), 0);

  return (
    <div>
      <PageHeader title="Journal d'équipe" description="Vue d'ensemble des EOD de votre équipe">
        <Link href="/team">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Équipe
          </Button>
        </Link>
      </PageHeader>

      {/* ── Alerte manquants ─────────────────────────── */}
      {currentMissing.length > 0 && (
        <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-orange-500">
              {currentMissing.length} setter{currentMissing.length > 1 ? "s" : ""} n{"'"}ont pas soumis leur EOD aujourd{"'"}hui
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentMissing.map((setter) => (
              <Badge key={setter.id} variant="outline" className="border-orange-500/50 text-orange-400">
                {setter.full_name || "Sans nom"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ── Date picker + stats ──────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-auto"
          />
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            {currentJournals.length} soumis
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {totalDms} DMs
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {totalCalls} calls
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Handshake className="h-3.5 w-3.5" />
            {totalDeals} deals
          </span>
          <span className="flex items-center gap-1 font-semibold text-green-500">
            <DollarSign className="h-3.5 w-3.5" />
            {totalRevenue.toLocaleString("fr-FR")} €
          </span>
        </div>
      </div>

      {/* ── Journal cards ────────────────────────────── */}
      {currentJournals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucun EOD soumis pour cette date</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentJournals.map((journal) => {
            const moodInfo = getMoodInfo(journal.mood);
            const MoodIcon = moodInfo.icon;
            const isExpanded = expandedIds.has(journal.id);

            return (
              <Card key={journal.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                        {(journal.profile?.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {journal.profile?.full_name || "Utilisateur"}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground capitalize">
                          {journal.profile?.role || "setter"}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", moodInfo.color)}>
                      <MoodIcon className="h-3 w-3 mr-1" />
                      {moodInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* KPIs compact */}
                  <div className="grid grid-cols-3 gap-2 text-center my-3">
                    <div className="bg-muted/50 rounded p-2">
                      <div className="text-base font-bold">{journal.dms_sent}</div>
                      <div className="text-[10px] text-muted-foreground">DMs</div>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <div className="text-base font-bold">{journal.calls_booked}</div>
                      <div className="text-[10px] text-muted-foreground">Appels</div>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <div className="text-base font-bold">{journal.deals_closed}</div>
                      <div className="text-[10px] text-muted-foreground">Deals</div>
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
