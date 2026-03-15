"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/page-header";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Smile,
  Frown,
  Meh,
  ThumbsUp,
  Heart,
  Star,
  Send,
  MessageSquare,
  Target,
  TrendingUp,
  Users,
  BarChart3,
  Phone,
  ArrowRight,
  Activity,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { saveDailyJournal } from "@/lib/actions/dashboard";
import { toast } from "sonner";
import { ReadinessGauge } from "@/components/readiness-gauge";
import type { ReadinessBreakdown } from "@/lib/actions/readiness";
import type { B2BDashboardData } from "@/lib/actions/dashboard";

// ─── B2C Types (existing) ──────────────────────────────────────

interface ClientDashboardData {
  courseProgress: Array<{
    title: string;
    completed: number;
    total: number;
  }>;
  todayJournal: {
    mood: number | null;
    wins: string | null;
    struggles: string | null;
    goals_tomorrow: string | null;
  } | null;
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    type: string;
  }>;
  profile: {
    onboarding_completed: boolean;
    onboarding_step: number;
    is_ready_to_place: boolean;
  };
  quizAttemptsToday: number;
}

// ─── Shared types ──────────────────────────────────────────────

type ClientDashboardProps =
  | {
      role: "client_b2b";
      b2bData: B2BDashboardData;
      userName: string;
      data?: never;
      readiness?: never;
    }
  | {
      role: "client_b2c";
      data: ClientDashboardData;
      userName: string;
      readiness?: ReadinessBreakdown;
      b2bData?: never;
    };

// ─── Mood icons (B2C only) ─────────────────────────────────────

const MOOD_ICONS = [
  { value: 1, icon: Frown, label: "Difficile", color: "text-red-500" },
  { value: 2, icon: Meh, label: "Moyen", color: "text-orange-400" },
  { value: 3, icon: Smile, label: "Correct", color: "text-yellow-400" },
  { value: 4, icon: ThumbsUp, label: "Bien", color: "text-green-400" },
  { value: 5, icon: Heart, label: "Super", color: "text-brand" },
];

function getEventIcon(type: string) {
  switch (type) {
    case "closing":
    case "discovery":
      return Calendar;
    default:
      return Clock;
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "message":
      return MessageSquare;
    case "booking":
      return Calendar;
    case "call":
      return Phone;
    default:
      return ArrowRight;
  }
}

function getActivityLabel(type: string) {
  switch (type) {
    case "message":
      return "Message";
    case "booking":
      return "RDV";
    case "call":
      return "Appel";
    default:
      return "Pipeline";
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Main Component ────────────────────────────────────────────

export function ClientDashboard(props: ClientDashboardProps) {
  if (props.role === "client_b2b") {
    return (
      <B2BClientDashboard data={props.b2bData} userName={props.userName} />
    );
  }

  return (
    <B2CClientDashboard
      data={props.data}
      userName={props.userName}
      readiness={props.readiness}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// B2B DASHBOARD
// ═══════════════════════════════════════════════════════════════

function B2BClientDashboard({
  data,
  userName,
}: {
  data: B2BDashboardData;
  userName: string;
}) {
  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description={`Bienvenue, ${userName}`}
      />

      {/* Welcome Card with quick stats */}
      <Card className="mb-6 bg-gradient-to-br from-brand/20 to-brand/5 border-brand/20">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2">
            Bonjour {userName.split(" ")[0]}, voici votre activite du mois
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Suivez les performances de votre setter et l&apos;avancement de
            votre pipeline commercial.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-3">
              <Send className="h-4 w-4 text-brand shrink-0" />
              <div>
                <p className="text-lg font-bold leading-tight">
                  {data.stats.messagesSent}
                </p>
                <p className="text-[11px] text-muted-foreground">Messages envoyes</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-3">
              <MessageSquare className="h-4 w-4 text-brand shrink-0" />
              <div>
                <p className="text-lg font-bold leading-tight">
                  {data.stats.responseRate}%
                </p>
                <p className="text-[11px] text-muted-foreground">Taux de reponse</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-3">
              <Calendar className="h-4 w-4 text-brand shrink-0" />
              <div>
                <p className="text-lg font-bold leading-tight">
                  {data.stats.bookingsBooked}
                </p>
                <p className="text-[11px] text-muted-foreground">RDV decroches</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-3">
              <Target className="h-4 w-4 text-brand shrink-0" />
              <div>
                <p className="text-lg font-bold leading-tight">
                  {data.stats.closingRate}%
                </p>
                <p className="text-[11px] text-muted-foreground">Taux de closing</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Setter */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <Users className="h-3.5 w-3.5 text-brand" />
              </div>
              Performance Setter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={data.setterPerformance.avatarUrl || undefined}
                />
                <AvatarFallback className="bg-brand/20 text-brand font-semibold">
                  {data.setterPerformance.setterName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {data.setterPerformance.setterName}
                </p>
                {data.setterPerformance.lastActivityAt && (
                  <p className="text-xs text-muted-foreground">
                    Derniere activite :{" "}
                    {formatDistanceToNow(
                      new Date(data.setterPerformance.lastActivityAt),
                      { addSuffix: true, locale: fr },
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/50 p-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <Send className="h-3.5 w-3.5 text-brand" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Messages / jour
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {data.setterPerformance.messagesPerDay}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 p-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Prospects contactes
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {data.setterPerformance.prospectsContacted}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 p-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Conversations actives
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {data.setterPerformance.activeConversations}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 p-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Taux de reponse
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{data.stats.responseRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Overview */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <BarChart3 className="h-3.5 w-3.5 text-brand" />
              </div>
              Pipeline commercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                Valeur totale
              </span>
              <span className="text-xl font-bold">
                {formatCurrency(data.pipelineTotal)}
              </span>
            </div>

            <div className="space-y-3">
              {data.pipeline
                .filter((s) => s.count > 0)
                .map((stage) => (
                  <div key={stage.stageName}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: stage.stageColor }}
                        />
                        <span className="text-sm">{stage.stageName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {stage.count}
                        </Badge>
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {formatCurrency(stage.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

              {data.pipeline.every((s) => s.count === 0) && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucun deal en cours dans le pipeline.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prochains rendez-vous */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <Calendar className="h-3.5 w-3.5 text-brand" />
              </div>
              Prochains rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Aucun rendez-vous a venir</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      <Calendar className="h-4 w-4 text-brand" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{booking.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(booking.time),
                          "EEEE dd MMMM 'a' HH:mm",
                          { locale: fr },
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {booking.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activite recente */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <Activity className="h-3.5 w-3.5 text-brand" />
              </div>
              Activite recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Activity className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Aucune activite recente</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.recentActivity.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5 rounded-xl bg-muted/60 p-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {activity.description ||
                            getActivityLabel(activity.type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.date), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {getActivityLabel(activity.type)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// B2C DASHBOARD (existing, preserved as-is)
// ═══════════════════════════════════════════════════════════════

function B2CClientDashboard({
  data,
  userName,
  readiness,
}: {
  data: ClientDashboardData;
  userName: string;
  readiness?: ReadinessBreakdown;
}) {
  const [mood, setMood] = useState<number>(data.todayJournal?.mood || 0);
  const [wins, setWins] = useState(data.todayJournal?.wins || "");
  const [challenges, setChallenges] = useState(
    data.todayJournal?.struggles || "",
  );
  const [goals, setGoals] = useState(data.todayJournal?.goals_tomorrow || "");
  const [isPending, startTransition] = useTransition();

  const hasJournal = !!data.todayJournal;

  // Calculate overall progress
  const totalLessons = data.courseProgress.reduce((s, c) => s + c.total, 0);
  const completedLessons = data.courseProgress.reduce(
    (s, c) => s + c.completed,
    0,
  );
  const overallProgress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  function handleSaveJournal() {
    if (mood === 0) {
      toast.error("Selectionne ton humeur du jour.");
      return;
    }
    startTransition(async () => {
      try {
        await saveDailyJournal({ mood, wins, challenges, goals });
        toast.success("Journal sauvegarde !");
      } catch {
        toast.error("Erreur lors de la sauvegarde.");
      }
    });
  }

  return (
    <div>
      <PageHeader title="Mon Espace" description={`Bienvenue, ${userName}`} />

      {/* Welcome card */}
      <Card className="mb-6 bg-gradient-to-br from-brand/20 to-brand/5 border-brand/20">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2">
            Continue sur ta lancee, {userName.split(" ")[0]} !
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Tu as complete {overallProgress}% de ta formation.
            {overallProgress < 100
              ? " Continue pour debloquer la suite."
              : " Felicitations, tu as tout termine !"}
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-2">
              <BookOpen className="h-4 w-4 text-brand" />
              <span className="text-sm">
                {completedLessons}/{totalLessons} lecons
              </span>
            </div>
            <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-2">
              <Calendar className="h-4 w-4 text-brand" />
              <span className="text-sm">
                {data.upcomingEvents.length} evenement
                {data.upcomingEvents.length > 1 ? "s" : ""} a venir
              </span>
            </div>
            {data.quizAttemptsToday > 0 && (
              <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-2">
                <Star className="h-4 w-4 text-brand" />
                <span className="text-sm">
                  {data.quizAttemptsToday} quiz aujourd&apos;hui
                </span>
              </div>
            )}
            {readiness && (
              <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-2">
                <Star className="h-4 w-4 text-brand" />
                <span className="text-sm">
                  Placement : {readiness.overall}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Readiness Gauge */}
      {readiness && (
        <div className="mb-6">
          <ReadinessGauge readiness={readiness} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Course Progress */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <BookOpen className="h-3.5 w-3.5 text-brand" />
              </div>
              Ma progression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.courseProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune formation en cours. Inscris-toi a un cours pour commencer
                !
              </p>
            ) : (
              data.courseProgress.map((course) => {
                const percent =
                  course.total > 0
                    ? Math.round((course.completed / course.total) * 100)
                    : 0;
                return (
                  <div key={course.title}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {percent === 100 ? (
                          <CheckCircle2 className="h-4 w-4 text-brand" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {course.title}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {percent}%
                      </span>
                    </div>
                    <Progress value={percent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {course.completed}/{course.total} lecons terminees
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
              </div>
              Prochains evenements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun evenement a venir.
              </p>
            ) : (
              <div className="space-y-4">
                {data.upcomingEvents.map((event) => {
                  const Icon = getEventIcon(event.type);
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 py-2 border-b last:border-0"
                    >
                      <div className="mt-0.5">
                        <Icon className="h-4 w-4 text-brand" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(event.date),
                            "EEEE dd MMMM 'a' HH:mm",
                            { locale: fr },
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Journal */}
      <Card className="border-border/50 hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
              <Star className="h-3.5 w-3.5 text-purple-500" />
            </div>
            {hasJournal ? "Journal du jour (deja rempli)" : "Journal du jour"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasJournal && !isPending ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Humeur :</span>
                <div className="flex items-center gap-1">
                  {MOOD_ICONS.map((m) => {
                    const MoodIcon = m.icon;
                    const isSelected = m.value === data.todayJournal?.mood;
                    return (
                      <MoodIcon
                        key={m.value}
                        className={`h-5 w-5 ${
                          isSelected ? m.color : "text-muted-foreground/30"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              {data.todayJournal?.wins && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Victoires
                  </p>
                  <p className="text-sm">{data.todayJournal.wins}</p>
                </div>
              )}
              {data.todayJournal?.struggles && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Defis
                  </p>
                  <p className="text-sm">{data.todayJournal.struggles}</p>
                </div>
              )}
              {data.todayJournal?.goals_tomorrow && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Objectifs demain
                  </p>
                  <p className="text-sm">{data.todayJournal.goals_tomorrow}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mood selector */}
              <div>
                <p className="text-sm font-medium mb-2">
                  Comment te sens-tu aujourd&apos;hui ?
                </p>
                <div className="flex items-center gap-3">
                  {MOOD_ICONS.map((m) => {
                    const MoodIcon = m.icon;
                    const isSelected = mood === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMood(m.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                          isSelected ? "bg-brand/10" : "hover:bg-muted"
                        }`}
                      >
                        <MoodIcon
                          className={`h-6 w-6 ${
                            isSelected ? m.color : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={`text-[10px] ${
                            isSelected
                              ? "font-semibold"
                              : "text-muted-foreground"
                          }`}
                        >
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wins */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Tes victoires du jour
                </label>
                <Textarea
                  placeholder="Qu'est-ce qui s'est bien passe aujourd'hui ?"
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Challenges */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Tes defis
                </label>
                <Textarea
                  placeholder="Quelles difficultes as-tu rencontrees ?"
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Goals */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Objectifs pour demain
                </label>
                <Textarea
                  placeholder="Que veux-tu accomplir demain ?"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                onClick={handleSaveJournal}
                disabled={isPending}
                className="bg-brand text-brand-dark hover:bg-brand/90 font-semibold"
              >
                {isPending ? "Sauvegarde..." : "Sauvegarder mon journal"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
