"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Video,
  Plus,
  Calendar,
  Users,
  Play,
  Clock,
  ArrowRight,
  Radio,
} from "lucide-react";
import { createVideoRoom } from "@/lib/actions/communication";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface VideoRoom {
  id: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  max_participants: number;
  host?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-green-500 text-white hover:bg-green-600">
          <Radio className="h-3 w-3 mr-1 animate-pulse" />
          En direct
        </Badge>
      );
    case "scheduled":
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-600 dark:text-blue-400">
          <Clock className="h-3 w-3 mr-1" />
          Planifiée
        </Badge>
      );
    case "ended":
      return (
        <Badge variant="secondary">
          Terminée
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function VideoListView({ rooms }: { rooms: VideoRoom[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("10");

  const scheduled = rooms.filter((r) => r.status === "scheduled");
  const live = rooms.filter((r) => r.status === "live");
  const ended = rooms.filter((r) => r.status === "ended");

  function handleCreate() {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (!scheduledAt) {
      toast.error("La date est requise");
      return;
    }

    startTransition(async () => {
      try {
        await createVideoRoom({
          title,
          scheduledAt: new Date(scheduledAt).toISOString(),
          maxParticipants: parseInt(maxParticipants) || 10,
        });
        toast.success("Visioconférence créée");
        setTitle("");
        setScheduledAt("");
        setMaxParticipants("10");
        setDialogOpen(false);
        router.refresh();
      } catch {
        toast.error("Erreur lors de la création");
      }
    });
  }

  function RoomCard({ room }: { room: VideoRoom }) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{room.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {room.host?.full_name || room.host?.email || "Hôte inconnu"}
              </p>
            </div>
            {getStatusBadge(room.status)}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            {room.scheduled_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {format(new Date(room.scheduled_at), "d MMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>Max {room.max_participants}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {room.status === "live" && (
              <Button
                size="sm"
                asChild
                className="bg-green-500 text-white hover:bg-green-600"
              >
                <Link href={`/chat/video/${room.id}`}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Rejoindre
                </Link>
              </Button>
            )}
            {room.status === "scheduled" && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/chat/video/${room.id}`}>
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  Détails
                </Link>
              </Button>
            )}
            {room.status === "ended" && (
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/chat/video/${room.id}`}>
                    Détails
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/chat/replays/${room.id}`}>
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Replay
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Visioconférences"
        description="Planifiez et gérez vos appels vidéo"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand text-brand-dark hover:bg-brand/90">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle visio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle visioconférence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Titre</Label>
                <Input
                  placeholder="Ex : Réunion d'équipe hebdomadaire"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-2 block">Date et heure</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-2 block">Participants max</Label>
                <Input
                  type="number"
                  min="2"
                  max="100"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={isPending}
                className="w-full bg-brand text-brand-dark hover:bg-brand/90"
              >
                <Video className="h-4 w-4 mr-2" />
                {isPending ? "Création..." : "Créer la visioconférence"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Tabs defaultValue="scheduled" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live" className="gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            En cours
            {live.length > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 justify-center bg-green-500 text-white text-[10px]">
                {live.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Planifiées
            {scheduled.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center text-[10px]">
                {scheduled.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ended" className="gap-1.5">
            Terminées
            {ended.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center text-[10px]">
                {ended.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          {live.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Video className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucune visio en cours</p>
                <p className="text-sm mt-1">Les sessions en direct apparaîtront ici</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {live.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled">
          {scheduled.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucune visio planifiée</p>
                <p className="text-sm mt-1">
                  Créez une nouvelle visioconférence pour commencer
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduled.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ended">
          {ended.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Video className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucune visio terminée</p>
                <p className="text-sm mt-1">
                  Les visios passées et leurs replays apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ended.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
