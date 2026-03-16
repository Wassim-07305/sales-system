"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  MessageSquare,
  Phone,
  Handshake,
  DollarSign,
  Pencil,
  CalendarDays,
  Smile,
  Meh,
  Frown,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  AlertTriangle,
  Target,
} from "lucide-react";
import { submitDailyJournal } from "@/lib/actions/gamification";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface JournalEntry {
  id?: string;
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
}

interface Props {
  todayJournal: JournalEntry | null;
  history: JournalEntry[];
}

const MOODS = [
  {
    value: "great",
    label: "Excellent",
    icon: Trophy,
    color: "text-green-500 border-green-500 bg-green-500/10",
  },
  {
    value: "good",
    label: "Bien",
    icon: ThumbsUp,
    color: "text-blue-500 border-blue-500 bg-blue-500/10",
  },
  {
    value: "neutral",
    label: "Neutre",
    icon: Meh,
    color: "text-yellow-500 border-yellow-500 bg-yellow-500/10",
  },
  {
    value: "tough",
    label: "Difficile",
    icon: Frown,
    color: "text-orange-500 border-orange-500 bg-orange-500/10",
  },
  {
    value: "bad",
    label: "Mauvais",
    icon: ThumbsDown,
    color: "text-red-500 border-red-500 bg-red-500/10",
  },
] as const;

function getMoodInfo(mood: string) {
  return MOODS.find((m) => m.value === mood) || MOODS[2];
}

export function JournalView({ todayJournal, history }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(!todayJournal);

  const [dmsSent, setDmsSent] = useState(todayJournal?.dms_sent ?? 0);
  const [repliesReceived, setRepliesReceived] = useState(
    todayJournal?.replies_received ?? 0,
  );
  const [callsBooked, setCallsBooked] = useState(
    todayJournal?.calls_booked ?? 0,
  );
  const [callsCompleted, setCallsCompleted] = useState(
    todayJournal?.calls_completed ?? 0,
  );
  const [dealsClosed, setDealsClosed] = useState(
    todayJournal?.deals_closed ?? 0,
  );
  const [revenueGenerated, setRevenueGenerated] = useState(
    todayJournal?.revenue_generated ?? 0,
  );
  const [mood, setMood] = useState<string>(todayJournal?.mood ?? "neutral");
  const [wins, setWins] = useState(todayJournal?.wins ?? "");
  const [blockers, setBlockers] = useState(todayJournal?.blockers ?? "");
  const [planTomorrow, setPlanTomorrow] = useState(
    todayJournal?.plan_tomorrow ?? "",
  );

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await submitDailyJournal({
        dms_sent: dmsSent,
        replies_received: repliesReceived,
        calls_booked: callsBooked,
        calls_completed: callsCompleted,
        deals_closed: dealsClosed,
        revenue_generated: revenueGenerated,
        mood: mood as "great" | "good" | "neutral" | "tough" | "bad",
        wins,
        blockers,
        plan_tomorrow: planTomorrow,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Journal soumis avec succès ! +5 points");
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  const recentHistory = history.slice(0, 7);

  return (
    <div>
      <PageHeader
        title="Journal de Bord"
        description="Rapport quotidien de vos activités"
      />

      {/* ── Formulaire EOD ───────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            EOD du jour
          </CardTitle>
          {todayJournal && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}
          {todayJournal && !isEditing && (
            <Badge
              variant="secondary"
              className="bg-green-500/10 text-green-500"
            >
              Soumis
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-6">
              {/* KPIs numériques */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Métriques du jour
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" />
                      DMs envoyés
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={dmsSent}
                      onChange={(e) => setDmsSent(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Smile className="h-3.5 w-3.5" />
                      Réponses reçues
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={repliesReceived}
                      onChange={(e) =>
                        setRepliesReceived(Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Phone className="h-3.5 w-3.5" />
                      Appels bookés
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={callsBooked}
                      onChange={(e) => setCallsBooked(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Phone className="h-3.5 w-3.5" />
                      Appels effectués
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={callsCompleted}
                      onChange={(e) =>
                        setCallsCompleted(Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Handshake className="h-3.5 w-3.5" />
                      Deals closés
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={dealsClosed}
                      onChange={(e) => setDealsClosed(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <DollarSign className="h-3.5 w-3.5" />
                      CA généré (€)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={revenueGenerated}
                      onChange={(e) =>
                        setRevenueGenerated(Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Mood selector */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Humeur du jour
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = mood === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMood(m.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all cursor-pointer",
                          isSelected
                            ? m.color
                            : "border-transparent hover:border-muted-foreground/20 bg-muted/50",
                        )}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-xs font-medium">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textes libres */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-green-500" />
                    Victoires du jour
                  </Label>
                  <Textarea
                    placeholder="Qu'est-ce qui s'est bien passé aujourd'hui ?"
                    value={wins}
                    onChange={(e) => setWins(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Blocages rencontrés
                  </Label>
                  <Textarea
                    placeholder="Qu'est-ce qui a été difficile ?"
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-blue-500" />
                    Plan pour demain
                  </Label>
                  <Textarea
                    placeholder="Quelles sont vos priorités pour demain ?"
                    value={planTomorrow}
                    onChange={(e) => setPlanTomorrow(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2">
                {todayJournal && (
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Annuler
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Soumettre mon EOD
                </Button>
              </div>
            </div>
          ) : (
            /* ── Read-only view ───────────────────────── */
            todayJournal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {
                      label: "DMs envoyés",
                      value: todayJournal.dms_sent,
                      icon: MessageSquare,
                    },
                    {
                      label: "Réponses",
                      value: todayJournal.replies_received,
                      icon: Smile,
                    },
                    {
                      label: "Appels bookés",
                      value: todayJournal.calls_booked,
                      icon: Phone,
                    },
                    {
                      label: "Appels effectués",
                      value: todayJournal.calls_completed,
                      icon: Phone,
                    },
                    {
                      label: "Deals closés",
                      value: todayJournal.deals_closed,
                      icon: Handshake,
                    },
                    {
                      label: "CA généré",
                      value: `${todayJournal.revenue_generated} €`,
                      icon: DollarSign,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="bg-muted/50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </div>
                        <div className="text-lg font-bold">{item.value}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Humeur :
                  </span>
                  {(() => {
                    const moodInfo = getMoodInfo(todayJournal.mood);
                    const Icon = moodInfo.icon;
                    return (
                      <Badge variant="outline" className={moodInfo.color}>
                        <Icon className="h-3.5 w-3.5 mr-1" />
                        {moodInfo.label}
                      </Badge>
                    );
                  })()}
                </div>

                {todayJournal.wins && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-green-500" />
                      Victoires
                    </p>
                    <p className="text-sm">{todayJournal.wins}</p>
                  </div>
                )}
                {todayJournal.blockers && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      Blocages
                    </p>
                    <p className="text-sm">{todayJournal.blockers}</p>
                  </div>
                )}
                {todayJournal.plan_tomorrow && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Target className="h-3.5 w-3.5 text-blue-500" />
                      Plan demain
                    </p>
                    <p className="text-sm">{todayJournal.plan_tomorrow}</p>
                  </div>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* ── Historique ────────────────────────────────── */}
      {recentHistory.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Historique (7 derniers jours)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentHistory.map((entry) => {
              const moodInfo = getMoodInfo(entry.mood);
              const MoodIcon = moodInfo.icon;
              return (
                <Card key={entry.date}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">
                        {new Date(entry.date).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", moodInfo.color)}
                      >
                        <MoodIcon className="h-3 w-3 mr-1" />
                        {moodInfo.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold">
                          {entry.dms_sent}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          DMs
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">
                          {entry.calls_booked}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Appels
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">
                          {entry.deals_closed}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Deals
                        </div>
                      </div>
                    </div>
                    {entry.revenue_generated > 0 && (
                      <div className="mt-2 text-center text-sm font-semibold text-green-500">
                        {entry.revenue_generated.toLocaleString("fr-FR")} € CA
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {recentHistory.length === 0 && !todayJournal && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucun journal soumis</p>
            <p className="text-sm mt-1">
              Commencez par remplir votre EOD du jour ci-dessus.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
