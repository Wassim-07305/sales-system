"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Pause,
  Clock,
  Calendar,
  Users,
  Bot,
  ListOrdered,
  ArrowLeft,
  Video,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Participant {
  id: string;
  user_id: string;
  joined_at: string | null;
  left_at: string | null;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface VideoRoom {
  id: string;
  title: string;
  host_id: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  max_participants: number;
  host?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
  participants: Participant[];
}

interface Recording {
  recording_url: string | null;
  ai_summary: string;
  chapters: Array<{ timestamp: string; label: string }>;
  title: string;
  started_at: string | null;
  ended_at: string | null;
}

function calculateDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return "N/A";
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}min`;
  }
  return `${minutes} min`;
}

export function ReplayView({
  room,
  recording,
}: {
  room: VideoRoom;
  recording: Recording | null;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  const duration = calculateDuration(room.started_at, room.ended_at);
  const chapters = recording?.chapters || [];

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link href="/chat/video">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux visios
          </Link>
        </Button>
        <PageHeader
          title={room.title}
          description="Replay de la visioconférence"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Video Player */}
          <Card className="overflow-hidden">
            <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
              <div className="text-center text-gray-400">
                {recording?.recording_url ? (
                  <video
                    src={recording.recording_url}
                    className="w-full h-full object-contain"
                    controls
                  />
                ) : (
                  <>
                    <div className="mb-4">
                      <Video className="h-16 w-16 mx-auto opacity-40" />
                    </div>
                    <p className="text-lg font-medium">
                      Replay bientôt disponible
                    </p>
                    <p className="text-sm mt-1 opacity-60">
                      L&apos;enregistrement est en cours de traitement
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Lecture (demo)
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* AI Summary */}
          {recording?.ai_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-5 w-5 text-brand" />
                  Résumé IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {recording.ai_summary}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Chapters */}
          {chapters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListOrdered className="h-5 w-5 text-brand" />
                  Chapitres
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {chapters.map((chapter, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedChapter(index)}
                      className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                        selectedChapter === index
                          ? "bg-brand/10 text-brand"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <Badge
                        variant="outline"
                        className={`shrink-0 font-mono text-[11px] ${
                          selectedChapter === index
                            ? "border-brand text-brand"
                            : ""
                        }`}
                      >
                        {chapter.timestamp}
                      </Badge>
                      <span className="text-sm">{chapter.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date */}
              {room.started_at && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {format(
                      new Date(room.started_at),
                      "d MMMM yyyy 'à' HH:mm",
                      { locale: fr }
                    )}
                  </span>
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Durée : {duration}</span>
              </div>

              {/* Host */}
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>
                  Hôte : {room.host?.full_name || room.host?.email || "Inconnu"}
                </span>
              </div>

              <Separator />

              {/* Participants */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Participants ({room.participants.length})
                  </span>
                </div>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {room.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center gap-2"
                      >
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                          {participant.user?.full_name?.charAt(0) ||
                            participant.user?.email?.charAt(0) ||
                            "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {participant.user?.full_name ||
                              participant.user?.email ||
                              "Participant"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {room.participants.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Aucun participant enregistré
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
