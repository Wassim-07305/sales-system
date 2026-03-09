"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { saveDailyJournal } from "@/lib/actions/dashboard";
import { toast } from "sonner";
import { ReadinessGauge } from "@/components/readiness-gauge";
import type { ReadinessBreakdown } from "@/lib/actions/readiness";

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

export function ClientDashboard({
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
    data.todayJournal?.struggles || ""
  );
  const [goals, setGoals] = useState(data.todayJournal?.goals_tomorrow || "");
  const [isPending, startTransition] = useTransition();

  const hasJournal = !!data.todayJournal;

  // Calculate overall progress
  const totalLessons = data.courseProgress.reduce((s, c) => s + c.total, 0);
  const completedLessons = data.courseProgress.reduce(
    (s, c) => s + c.completed,
    0
  );
  const overallProgress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  function handleSaveJournal() {
    if (mood === 0) {
      toast.error("Sélectionne ton humeur du jour.");
      return;
    }
    startTransition(async () => {
      try {
        await saveDailyJournal({ mood, wins, challenges, goals });
        toast.success("Journal sauvegardé !");
      } catch {
        toast.error("Erreur lors de la sauvegarde.");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Mon Espace"
        description={`Bienvenue, ${userName}`}
      />

      {/* Welcome card */}
      <Card className="mb-6 bg-brand-dark text-white border-0">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2">
            Continue sur ta lancée, {userName.split(" ")[0]} !
          </h2>
          <p className="text-white/70 text-sm mb-4">
            Tu as complété {overallProgress}% de ta formation.
            {overallProgress < 100
              ? " Continue pour débloquer la suite."
              : " Félicitations, tu as tout terminé !"}
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <BookOpen className="h-4 w-4 text-brand" />
              <span className="text-sm">
                {completedLessons}/{totalLessons} leçons
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Calendar className="h-4 w-4 text-brand" />
              <span className="text-sm">
                {data.upcomingEvents.length} événement
                {data.upcomingEvents.length > 1 ? "s" : ""} à venir
              </span>
            </div>
            {data.quizAttemptsToday > 0 && (
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <Star className="h-4 w-4 text-brand" />
                <span className="text-sm">
                  {data.quizAttemptsToday} quiz aujourd&apos;hui
                </span>
              </div>
            )}
            {readiness && (
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand" />
              Ma progression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.courseProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune formation en cours. Inscris-toi à un cours pour
                commencer !
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
                      {course.completed}/{course.total} leçons terminées
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prochains événements</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun événement à venir.
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
                            { locale: fr }
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {hasJournal
              ? "Journal du jour (déjà rempli)"
              : "Journal du jour"}
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
                          isSelected
                            ? m.color
                            : "text-muted-foreground/30"
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
                    Défis
                  </p>
                  <p className="text-sm">{data.todayJournal.struggles}</p>
                </div>
              )}
              {data.todayJournal?.goals_tomorrow && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Objectifs demain
                  </p>
                  <p className="text-sm">
                    {data.todayJournal.goals_tomorrow}
                  </p>
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
                          isSelected
                            ? "bg-brand/10"
                            : "hover:bg-muted"
                        }`}
                      >
                        <MoodIcon
                          className={`h-6 w-6 ${
                            isSelected
                              ? m.color
                              : "text-muted-foreground"
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
                  placeholder="Qu'est-ce qui s'est bien passé aujourd'hui ?"
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Challenges */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Tes défis
                </label>
                <Textarea
                  placeholder="Quelles difficultés as-tu rencontrées ?"
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
