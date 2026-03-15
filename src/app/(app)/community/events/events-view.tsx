"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Video,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  createEvent,
  registerForEvent,
  unregisterFromEvent,
  type EventMetadata,
} from "@/lib/actions/community";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface EventPost {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  metadata: EventMetadata | null;
}

const eventTypeLabels: Record<string, string> = {
  webinar: "Webinar",
  ama: "AMA",
  workshop: "Workshop",
  masterclass: "Masterclass",
};

const eventTypeColors: Record<string, string> = {
  webinar: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ama: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  workshop: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  masterclass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

export function EventsView({
  upcoming,
  past,
  participantCounts,
  userRsvpIds,
  isAdmin,
}: {
  upcoming: EventPost[];
  past: EventPost[];
  participantCounts: Record<string, number>;
  userRsvpIds: string[];
  isAdmin: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [rsvpSet, setRsvpSet] = useState<Set<string>>(new Set(userRsvpIds));
  const [loadingRsvp, setLoadingRsvp] = useState<string | null>(null);

  // Create event form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<string>("webinar");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("14:00");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("50");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !eventDate || !eventTime) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    setCreating(true);
    try {
      await createEvent({
        title,
        metadata: {
          description,
          event_date: eventDate,
          event_time: eventTime,
          duration: parseInt(duration) || 60,
          location,
          max_participants: parseInt(maxParticipants) || 50,
          type: eventType as EventMetadata["type"],
        },
      });
      toast.success("Événement créé !");
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setEventType("webinar");
    setEventDate("");
    setEventTime("14:00");
    setDuration("60");
    setLocation("");
    setMaxParticipants("50");
  }

  async function handleToggleRsvp(eventId: string) {
    setLoadingRsvp(eventId);
    const isRegistered = rsvpSet.has(eventId);
    try {
      if (isRegistered) {
        await unregisterFromEvent(eventId);
        const newSet = new Set(rsvpSet);
        newSet.delete(eventId);
        setRsvpSet(newSet);
        toast.success("Inscription annulée");
      } else {
        await registerForEvent(eventId);
        const newSet = new Set(rsvpSet);
        newSet.add(eventId);
        setRsvpSet(newSet);
        toast.success("Inscription confirmée !");
      }
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur"
      );
    } finally {
      setLoadingRsvp(null);
    }
  }

  function EventCard({
    event,
    isPast,
  }: {
    event: EventPost;
    isPast?: boolean;
  }) {
    const meta = event.metadata;
    if (!meta) return null;
    const isRegistered = rsvpSet.has(event.id);
    const count = participantCounts[event.id] || 0;
    const isFull = meta.max_participants > 0 && count >= meta.max_participants;

    return (
      <Card
        className={`rounded-2xl border-border/40 transition-all duration-300 hover:shadow-lg hover:shadow-brand/5 ${isPast ? "opacity-70" : ""}`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Date block */}
            <div className="flex sm:flex-col items-center gap-2 sm:gap-0 sm:w-16 shrink-0 sm:text-center">
              <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <Calendar className="h-5 w-5 text-brand" />
              </div>
              <div className="sm:mt-1">
                <p className="text-xs font-semibold text-brand">
                  {new Date(meta.event_date + "T00:00:00").toLocaleDateString(
                    "fr-FR",
                    { day: "numeric", month: "short" }
                  )}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={eventTypeColors[meta.type] || ""}
                >
                  {eventTypeLabels[meta.type] || meta.type}
                </Badge>
                {isFull && !isPast && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                    Complet
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
              {meta.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {meta.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatEventDate(meta.event_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {meta.event_time} ({formatDuration(meta.duration)})
                </span>
                {meta.location && (
                  <span className="flex items-center gap-1">
                    {meta.location.startsWith("http") ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5" />
                    )}
                    {meta.location.startsWith("http") ? "En ligne" : meta.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {count}
                  {meta.max_participants > 0
                    ? ` / ${meta.max_participants}`
                    : ""}{" "}
                  participant{count !== 1 ? "s" : ""}
                </span>
              </div>
              {event.author && (
                <p className="text-xs text-muted-foreground mt-2">
                  Organisé par {event.author.full_name || "Anonyme"}
                </p>
              )}
            </div>

            {/* Action */}
            {!isPast && (
              <div className="shrink-0 sm:self-center">
                <Button
                  variant={isRegistered ? "outline" : "default"}
                  className={
                    isRegistered
                      ? "border-brand text-brand hover:bg-brand/10"
                      : "bg-brand text-brand-dark hover:bg-brand/90"
                  }
                  disabled={loadingRsvp === event.id || (isFull && !isRegistered)}
                  onClick={() => handleToggleRsvp(event.id)}
                >
                  {isRegistered ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Inscrit
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      S&apos;inscrire
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Événements"
        description="Webinars, AMA, workshops et masterclasses"
      >
        <div className="flex gap-2">
          <Link href="/community">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Communauté
            </Button>
          </Link>
          {isAdmin && (
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-brand text-brand-dark hover:bg-brand/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un événement
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Upcoming events */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand" />
          Événements à venir
          <Badge variant="outline" className="ml-1">
            {upcoming.length}
          </Badge>
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-7 w-7 opacity-50" />
              </div>
              <p className="font-medium">Aucun événement prévu</p>
              <p className="text-sm">
                {isAdmin
                  ? "Créez un événement pour engager la communauté !"
                  : "Revenez bientôt pour découvrir les prochains événements."}
              </p>
            </CardContent>
          </Card>
        ) : (
          upcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </div>

      {/* Past events */}
      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            {showPast ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Événements passés ({past.length})
          </button>
          {showPast && (
            <div className="space-y-4">
              {past.map((event) => (
                <EventCard key={event.id} event={event} isPast />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create event dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                Titre <span className="text-red-500">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Masterclass closing B2B"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Décrivez l'événement..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="ama">AMA</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="masterclass">Masterclass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Durée (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="15"
                  step="15"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div>
                <Label>
                  Heure <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Lieu / Lien de réunion</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="https://meet.google.com/... ou adresse physique"
              />
            </div>
            <div>
              <Label>Nombre max. de participants</Label>
              <Input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                min="0"
                placeholder="0 = illimité"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            >
              {creating ? "Création..." : "Créer l'événement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
