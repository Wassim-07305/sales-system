"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Search, Clock, Calendar, Users, Video } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Replay {
  id: string;
  title: string;
  started_at: string | null;
  ended_at: string | null;
  recording_url: string | null;
  max_participants: number;
  host?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

function getDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest > 0 ? `${rest.toString().padStart(2, "0")}` : ""}`;
}

export function ReplaysListView({ replays }: { replays: Replay[] }) {
  const [search, setSearch] = useState("");

  const filtered = replays.filter(
    (r) =>
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.host?.full_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Replays"
        description="Enregistrements des sessions vidéo passées"
      />

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un replay..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 text-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Video className="h-7 w-7 opacity-40" />
              </div>
              <p className="font-medium">Aucun replay disponible</p>
              <p className="text-sm mt-1">
                Les enregistrements des sessions vidéo apparaîtront ici
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((replay) => (
              <Card
                key={replay.id}
                className="border-border/50 hover:shadow-md transition-all"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-9 w-9 rounded-lg ring-1 ring-emerald-500/20 bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Play className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {replay.title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground mt-1">
                        {replay.started_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(replay.started_at), "d MMM yyyy", {
                              locale: fr,
                            })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getDuration(replay.started_at, replay.ended_at)}
                        </span>
                        {replay.host?.full_name && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {replay.host.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/chat/replays/${replay.id}`}>
                      <Play className="h-4 w-4 mr-1" />
                      Regarder
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
