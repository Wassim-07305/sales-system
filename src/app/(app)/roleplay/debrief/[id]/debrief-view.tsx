"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  User,
  Bot,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  Handshake,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Feedback {
  score: number;
  strengths: string[];
  improvements: string[];
  objection_handling: number;
  rapport_building: number;
  closing_technique: number;
}

interface Profile {
  name: string;
  niche: string;
  difficulty: string;
}

interface PastSession {
  score: number | null;
  ai_feedback: Feedback | null;
  started_at: string;
}

interface Session {
  id: string;
  score: number | null;
  ai_feedback: Feedback | null;
  conversation: Message[];
  duration_seconds: number | null;
  profile: Profile | null;
  pastSessions?: PastSession[];
}

interface Props {
  session: Session;
}

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-green-600 border-green-200 bg-green-50"
      : score >= 60
        ? "text-orange-600 border-orange-200 bg-orange-50"
        : "text-red-600 border-red-200 bg-red-50";

  return (
    <div
      className={cn(
        "h-32 w-32 rounded-full border-4 flex flex-col items-center justify-center mx-auto",
        color
      )}
    >
      <span className="text-4xl font-bold">{score}</span>
      <span className="text-xs opacity-70">/100</span>
    </div>
  );
}

function MetricBar({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color =
    value >= 80
      ? "[&>div]:bg-green-500"
      : value >= 60
        ? "[&>div]:bg-orange-500"
        : "[&>div]:bg-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </div>
        <span className="text-sm font-semibold">{value}%</span>
      </div>
      <Progress value={value} className={cn("h-2.5", color)} />
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

export function DebriefView({ session }: Props) {
  const feedback = session.ai_feedback;
  const score = session.score || feedback?.score || 0;
  const messages = Array.isArray(session.conversation)
    ? session.conversation
    : [];

  return (
    <div>
      <PageHeader
        title="D\u00e9briefing"
        description={
          session.profile
            ? `Session avec ${session.profile.name} - ${session.profile.niche}`
            : "R\u00e9sum\u00e9 de votre session"
        }
      >
        <div className="flex gap-2">
          <Link href="/roleplay">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Link href="/roleplay">
            <Button size="sm" className="bg-brand text-brand-dark hover:bg-brand/90">
              <RotateCcw className="h-4 w-4 mr-2" />
              Nouvelle session
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Score + Metrics + Feedback */}
        <div className="lg:col-span-1 space-y-6">
          {/* Score */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-brand" />
                <h3 className="font-semibold">Score global</h3>
              </div>
              <ScoreCircle score={score} />
              {session.duration_seconds && (
                <p className="text-sm text-muted-foreground mt-4">
                  Dur\u00e9e : {formatDuration(session.duration_seconds)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metrics */}
          {feedback && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">M\u00e9triques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <MetricBar
                  label="Gestion objections"
                  value={feedback.objection_handling}
                  icon={ShieldCheck}
                />
                <MetricBar
                  label="Cr\u00e9ation de rapport"
                  value={feedback.rapport_building}
                  icon={Handshake}
                />
                <MetricBar
                  label="Technique de closing"
                  value={feedback.closing_technique}
                  icon={Target}
                />
              </CardContent>
            </Card>
          )}

          {/* Strengths & Improvements */}
          {feedback && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Analyse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedback.strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Points forts
                    </h4>
                    <ul className="space-y-1.5">
                      {feedback.strengths.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {feedback.improvements.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Axes d&apos;am\u00e9lioration
                    </h4>
                    <ul className="space-y-1.5">
                      {feedback.improvements.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progression vs past sessions */}
          {session.pastSessions && session.pastSessions.length > 0 && feedback && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand" />
                  Progression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(() => {
                    const pastScores = session.pastSessions!
                      .filter((s) => s.score !== null)
                      .map((s) => s.score!);
                    const avgPast = pastScores.length > 0
                      ? Math.round(pastScores.reduce((a, b) => a + b, 0) / pastScores.length)
                      : 0;
                    const diff = score - avgPast;
                    const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
                    const trendColor = diff > 0 ? "text-green-500" : diff < 0 ? "text-red-400" : "text-muted-foreground";

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Moy. sessions precedentes</span>
                          <span className="text-sm font-medium">{avgPast}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Cette session</span>
                          <span className="text-sm font-bold">{score}%</span>
                        </div>
                        <div className={cn("flex items-center gap-1 pt-1", trendColor)}>
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {diff > 0 ? `+${diff}` : diff} points
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({pastScores.length} session{pastScores.length > 1 ? "s" : ""} precedente{pastScores.length > 1 ? "s" : ""})
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommended exercises */}
          {feedback && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Exercices recommandes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {feedback.objection_handling < 70 && (
                  <Link href="/roleplay" className="block p-2 rounded-lg bg-muted/50 hover:bg-muted text-sm">
                    Entrainement gestion des objections (score: {feedback.objection_handling}%)
                  </Link>
                )}
                {feedback.rapport_building < 70 && (
                  <Link href="/roleplay" className="block p-2 rounded-lg bg-muted/50 hover:bg-muted text-sm">
                    Entrainement creation de rapport (score: {feedback.rapport_building}%)
                  </Link>
                )}
                {feedback.closing_technique < 70 && (
                  <Link href="/roleplay" className="block p-2 rounded-lg bg-muted/50 hover:bg-muted text-sm">
                    Entrainement technique de closing (score: {feedback.closing_technique}%)
                  </Link>
                )}
                {feedback.objection_handling >= 70 && feedback.rapport_building >= 70 && feedback.closing_technique >= 70 && (
                  <p className="text-sm text-muted-foreground">
                    Excellent ! Tous tes scores sont au-dessus de 70%. Continue comme ca !
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Conversation replay */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Conversation compl\u00e8te
                <Badge variant="outline" className="text-[10px]">
                  {messages.length} messages
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px] pr-2">
                <div className="space-y-4">
                  {messages.map((msg, i) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={i}
                        className={cn("flex gap-3", isUser && "flex-row-reverse")}
                      >
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                            isUser
                              ? "bg-brand/10 text-brand"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isUser ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "max-w-[80%]",
                            isUser && "text-right"
                          )}
                        >
                          <div
                            className={cn(
                              "inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                              isUser
                                ? "bg-brand-dark text-white rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            )}
                          >
                            {msg.content}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 px-1">
                            {new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun message dans cette session.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
