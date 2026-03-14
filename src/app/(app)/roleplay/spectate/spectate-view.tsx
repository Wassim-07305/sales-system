"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Clock, User, Trophy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface Session {
  id: string;
  status: string;
  score: number | null;
  started_at: string;
  duration_seconds: number | null;
  profile: { name: string; niche: string; difficulty: string } | null;
  user: { full_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  sessions: Session[];
}

const difficultyColors: Record<string, string> = {
  Facile: "bg-brand/10 text-brand border-brand/20",
  Moyen: "bg-muted/60 text-muted-foreground border-border",
  Difficile: "bg-foreground/10 text-foreground border-border",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

export function SpectateView({ sessions }: Props) {
  const completedSessions = sessions.filter((s) => s.status === "completed");

  return (
    <div>
      <PageHeader
        title="Mode Spectateur"
        description="Observez les sessions de jeu de rôles de l'équipe pour apprendre et s'inspirer"
      >
        <Link href="/roleplay">
          <Button variant="outline" size="sm">
            Retour
          </Button>
        </Link>
      </PageHeader>

      {completedSessions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Eye className="h-7 w-7 opacity-50" />
            </div>
            <p className="font-medium">Aucune session terminée</p>
            <p className="text-sm mt-1">
              Les sessions complétées par l&apos;équipe apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedSessions.map((session) => (
            <Link
              key={session.id}
              href={`/roleplay/debrief/${session.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-5">
                  {/* User */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center text-brand text-sm font-bold ring-1 ring-brand/20">
                      {session.user?.full_name?.charAt(0) || (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {session.user?.full_name || "Anonyme"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.started_at), "d MMM yyyy 'à' HH:mm", {
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Profile info */}
                  <div className="mb-3">
                    <p className="text-sm font-medium">
                      {session.profile?.name || "Profil supprimé"}
                    </p>
                    <div className="flex gap-2 mt-1.5">
                      {session.profile?.niche && (
                        <Badge variant="outline" className="text-[10px]">
                          {session.profile.niche}
                        </Badge>
                      )}
                      {session.profile?.difficulty && (
                        <Badge
                          variant="outline"
                          className={`${difficultyColors[session.profile.difficulty] || ""} text-[10px]`}
                        >
                          {session.profile.difficulty}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Score & Duration */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-brand" />
                      {session.score !== null ? (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            session.score >= 80
                              ? "bg-brand/10 text-brand border-brand/20"
                              : session.score >= 60
                                ? "bg-muted/60 text-muted-foreground border-border"
                                : "bg-foreground/10 text-foreground border-border"
                          }`}
                        >
                          {session.score}/100
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(session.duration_seconds)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
