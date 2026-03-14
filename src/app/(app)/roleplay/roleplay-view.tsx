"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startSession } from "@/lib/actions/roleplay";
import {
  Play,
  Trophy,
  BarChart3,
  Star,
  Clock,
  User,
  Linkedin,
  Instagram,
  Eye,
  Settings,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string;
  niche: string;
  persona: string;
  difficulty: string;
  objections: string[];
  scenario: string;
  network: string;
}

interface Session {
  id: string;
  status: string;
  score: number | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  profile: { name: string; niche: string; difficulty: string } | null;
}

interface Props {
  profiles: Profile[];
  sessions: Session[];
}

const difficultyColors: Record<string, string> = {
  Facile: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Moyen: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Difficile: "bg-red-500/10 text-red-600 border-red-500/20",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

export function RoleplayView({ profiles, sessions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startingId, setStartingId] = useState<string | null>(null);

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const totalSessions = completedSessions.length;
  const avgScore =
    totalSessions > 0
      ? Math.round(
          completedSessions.reduce((sum, s) => sum + (s.score || 0), 0) / totalSessions
        )
      : 0;
  const bestScore =
    totalSessions > 0
      ? Math.max(...completedSessions.map((s) => s.score || 0))
      : 0;

  function handleStart(profileId: string) {
    setStartingId(profileId);
    startTransition(async () => {
      try {
        const session = await startSession(profileId);
        if (session) {
          router.push(`/roleplay/session/${session.id}`);
        }
      } catch {
        toast.error("Erreur lors du lancement de la session");
        setStartingId(null);
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Jeu de R\u00f4les IA"
        description="Entra\u00eenez-vous au closing avec des prospects virtuels"
      >
        <div className="flex gap-2">
          <Link href="/roleplay/spectate">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Spectateur
            </Button>
          </Link>
          <Link href="/roleplay/profiles">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Profils
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-brand" />
              <span className="text-xs text-muted-foreground">Total sessions</span>
            </div>
            <p className="text-2xl font-bold">{totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-brand" />
              <span className="text-xs text-muted-foreground">Score moyen</span>
            </div>
            <p className="text-2xl font-bold">{avgScore || "--"}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-brand" />
              <span className="text-xs text-muted-foreground">Meilleure session</span>
            </div>
            <p className="text-2xl font-bold">{bestScore || "--"}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Available profiles */}
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-brand" />
        Profils disponibles
      </h2>

      {profiles.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="p-8 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <User className="h-7 w-7 opacity-50" />
            </div>
            <p>Aucun profil prospect configur\u00e9.</p>
            <p className="text-sm">Demandez \u00e0 un admin de cr\u00e9er des profils.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {profiles.map((profile) => (
            <Card key={profile.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{profile.name}</h3>
                    <div className="flex gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {profile.network === "LinkedIn" ? (
                          <Linkedin className="h-3 w-3" />
                        ) : (
                          <Instagram className="h-3 w-3" />
                        )}
                        {profile.network}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {profile.niche}
                      </Badge>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${difficultyColors[profile.difficulty] || "bg-muted/50 text-muted-foreground border-border"} text-[10px]`}
                  >
                    {profile.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {profile.persona}
                </p>
                <Button
                  onClick={() => handleStart(profile.id)}
                  disabled={isPending}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                >
                  {isPending && startingId === profile.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  D\u00e9marrer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand" />
            Sessions r\u00e9centes
          </h2>
          <div className="space-y-2">
            {sessions.slice(0, 10).map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground min-w-[100px]">
                        {format(new Date(session.started_at), "d MMM yyyy", { locale: fr })}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {session.profile?.name || "Profil supprim\u00e9"}
                        </p>
                        <div className="flex gap-2 mt-0.5">
                          {session.profile?.difficulty && (
                            <Badge
                              variant="outline"
                              className={`${difficultyColors[session.profile.difficulty] || ""} text-[10px]`}
                            >
                              {session.profile.difficulty}
                            </Badge>
                          )}
                          {session.duration_seconds && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(session.duration_seconds)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.status === "completed" && session.score !== null ? (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            session.score >= 80
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : session.score >= 60
                                ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                          }`}
                        >
                          {session.score}/100
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {session.status === "active" ? "En cours" : session.status}
                        </Badge>
                      )}
                      {session.status === "completed" ? (
                        <Link href={`/roleplay/debrief/${session.id}`}>
                          <Button variant="outline" size="sm">
                            Voir
                          </Button>
                        </Link>
                      ) : session.status === "active" ? (
                        <Link href={`/roleplay/session/${session.id}`}>
                          <Button size="sm" className="bg-brand text-brand-dark hover:bg-brand/90">
                            Reprendre
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
