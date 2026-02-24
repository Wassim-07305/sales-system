"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Play,
  Pause,
  Users,
  MessageSquare,
  BarChart3,
  Plus,
  Send,
  Radio,
  Circle,
  ArrowLeft,
} from "lucide-react";
import {
  joinRoom,
  startRoom,
  endRoom,
  createPoll,
  votePoll,
  getRoomPolls,
} from "@/lib/actions/communication";
import { toast } from "sonner";
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

interface Poll {
  id: string;
  question: string;
  options: Array<{ text: string; vote_count: number }>;
  is_active: boolean;
  created_at: string;
}

interface VideoRoom {
  id: string;
  title: string;
  host_id: string;
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
  participants: Participant[];
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

export function VideoRoomView({
  room,
  currentUserId,
}: {
  room: VideoRoom;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"participants" | "chat" | "polls">("participants");

  // Chat state (local only, stub)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Poll state
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const isHost = room.host_id === currentUserId;
  const isLive = room.status === "live";
  const isScheduled = room.status === "scheduled";
  const isEnded = room.status === "ended";
  const activeParticipants = room.participants.filter((p) => !p.left_at);

  function handleSendChat() {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "Vous",
        text: chatInput,
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setChatInput("");
  }

  function handleJoin() {
    startTransition(async () => {
      try {
        await joinRoom(room.id);
        toast.success("Vous avez rejoint la visio");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la connexion");
      }
    });
  }

  function handleStart() {
    startTransition(async () => {
      try {
        await startRoom(room.id);
        toast.success("Visioconférence démarrée");
        router.refresh();
      } catch {
        toast.error("Erreur lors du démarrage");
      }
    });
  }

  function handleEnd() {
    startTransition(async () => {
      try {
        await endRoom(room.id);
        toast.success("Visioconférence terminée");
        router.refresh();
      } catch {
        toast.error("Erreur lors de l'arrêt");
      }
    });
  }

  function handleCreatePoll() {
    const validOptions = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) {
      toast.error("Question et au moins 2 options requises");
      return;
    }

    startTransition(async () => {
      try {
        await createPoll({
          roomId: room.id,
          question: pollQuestion,
          options: validOptions,
        });
        toast.success("Sondage créé");
        setPollQuestion("");
        setPollOptions(["", ""]);
        setPollDialogOpen(false);
        // Refresh polls
        const updated = await getRoomPolls(room.id);
        setPolls(updated as Poll[]);
      } catch {
        toast.error("Erreur lors de la création du sondage");
      }
    });
  }

  function handleVote(pollId: string, optionIndex: number) {
    startTransition(async () => {
      try {
        await votePoll(pollId, optionIndex);
        toast.success("Vote enregistré");
        const updated = await getRoomPolls(room.id);
        setPolls(updated as Poll[]);
      } catch {
        toast.error("Erreur lors du vote");
      }
    });
  }

  function addPollOption() {
    setPollOptions((prev) => [...prev, ""]);
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  // Load polls on mount for polls tab
  function handlePollsTab() {
    setSidebarTab("polls");
    startTransition(async () => {
      const data = await getRoomPolls(room.id);
      setPolls(data as Poll[]);
    });
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/chat/video">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{room.title}</h1>
            <p className="text-xs text-muted-foreground">
              {room.host?.full_name || room.host?.email || "Hôte"}
              {room.scheduled_at &&
                ` — ${format(new Date(room.scheduled_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
              <Circle className="h-2.5 w-2.5 fill-red-500 animate-pulse" />
              Enregistrement
            </div>
          )}
          {isHost && isScheduled && (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={isPending}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Démarrer
            </Button>
          )}
          {isHost && isLive && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleEnd}
              disabled={isPending}
            >
              <PhoneOff className="h-3.5 w-3.5 mr-1" />
              Terminer
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col">
          {/* Video placeholder */}
          <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
            <div className="text-center text-gray-400">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-40" />
              {isLive ? (
                <p className="text-lg font-medium text-white">
                  Visioconférence en cours...
                </p>
              ) : isScheduled ? (
                <p className="text-lg font-medium">En attente de démarrage</p>
              ) : (
                <p className="text-lg font-medium">Visioconférence terminée</p>
              )}
              {isScheduled && !isHost && (
                <Button
                  onClick={handleJoin}
                  disabled={isPending}
                  className="mt-4 bg-brand text-brand-dark hover:bg-brand/90"
                >
                  Rejoindre la salle d&apos;attente
                </Button>
              )}
              {isLive && (
                <Button
                  onClick={handleJoin}
                  disabled={isPending}
                  className="mt-4 bg-green-500 text-white hover:bg-green-600"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Rejoindre
                </Button>
              )}
            </div>

            {/* Participant count overlay */}
            <div className="absolute top-4 left-4 bg-black/60 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {activeParticipants.length} / {room.max_participants}
            </div>
          </div>

          {/* Controls bar */}
          {(isLive || isScheduled) && (
            <div className="bg-gray-900 border-t border-gray-700 py-3 px-4 flex items-center justify-center gap-3">
              <Button
                size="sm"
                variant={cameraOn ? "secondary" : "destructive"}
                onClick={() => setCameraOn(!cameraOn)}
                className="rounded-full h-10 w-10 p-0"
              >
                {cameraOn ? (
                  <Camera className="h-4 w-4" />
                ) : (
                  <CameraOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant={micOn ? "secondary" : "destructive"}
                onClick={() => setMicOn(!micOn)}
                className="rounded-full h-10 w-10 p-0"
              >
                {micOn ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant={screenSharing ? "default" : "secondary"}
                onClick={() => {
                  setScreenSharing(!screenSharing);
                  toast.info(
                    screenSharing
                      ? "Partage d'écran arrêté"
                      : "Partage d'écran activé (stub)"
                  );
                }}
                className="rounded-full h-10 w-10 p-0"
              >
                <MonitorUp className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  toast.info("Vous avez quitté l'appel");
                  router.push("/chat/video");
                }}
                className="rounded-full h-10 w-10 p-0"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-80 border-l flex flex-col bg-background">
          {/* Sidebar tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setSidebarTab("participants")}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                sidebarTab === "participants"
                  ? "text-brand border-b-2 border-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Participants
            </button>
            <button
              onClick={() => setSidebarTab("chat")}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                sidebarTab === "chat"
                  ? "text-brand border-b-2 border-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              onClick={handlePollsTab}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                sidebarTab === "polls"
                  ? "text-brand border-b-2 border-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Sondages
            </button>
          </div>

          {/* Participants panel */}
          {sidebarTab === "participants" && (
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {/* Host */}
                {room.host && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-brand/5">
                    <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">
                      {room.host.full_name?.charAt(0) || room.host.email.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {room.host.full_name || room.host.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Hôte</p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                )}

                {/* Other participants */}
                {activeParticipants
                  .filter((p) => p.user_id !== room.host_id)
                  .map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                        {participant.user?.full_name?.charAt(0) ||
                          participant.user?.email?.charAt(0) ||
                          "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {participant.user?.full_name ||
                            participant.user?.email ||
                            "Participant"}
                        </p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                  ))}

                {activeParticipants.length === 0 && !room.host && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucun participant
                  </p>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Chat panel */}
          {sidebarTab === "chat" && (
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun message dans le chat
                    </p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="text-sm">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-xs">{msg.sender}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {msg.time}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {msg.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Écrire un message..."
                  className="text-xs h-8"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendChat()
                  }
                />
                <Button size="sm" className="h-8 w-8 p-0" onClick={handleSendChat}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Polls panel */}
          {sidebarTab === "polls" && (
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b">
                <Button
                  size="sm"
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                  onClick={() => setPollDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Créer un sondage
                </Button>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4">
                  {polls.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun sondage
                    </p>
                  ) : (
                    polls.map((poll) => {
                      const totalVotes = poll.options.reduce(
                        (sum, o) => sum + o.vote_count,
                        0
                      );
                      return (
                        <Card key={poll.id}>
                          <CardContent className="pt-4 pb-3">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium">
                                {poll.question}
                              </p>
                              {poll.is_active && (
                                <Badge className="bg-green-100 text-green-700 text-[10px]">
                                  Actif
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              {poll.options.map((option, idx) => {
                                const pct =
                                  totalVotes > 0
                                    ? Math.round(
                                        (option.vote_count / totalVotes) * 100
                                      )
                                    : 0;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() =>
                                      poll.is_active &&
                                      handleVote(poll.id, idx)
                                    }
                                    disabled={!poll.is_active || isPending}
                                    className="w-full text-left"
                                  >
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span>{option.text}</span>
                                      <span className="text-muted-foreground">
                                        {pct}% ({option.vote_count})
                                      </span>
                                    </div>
                                    <Progress value={pct} className="h-1.5" />
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {totalVotes} vote(s)
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Create Poll Dialog */}
      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un sondage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Question</Label>
              <Input
                placeholder="Posez votre question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Options</Label>
              <div className="space-y-2">
                {pollOptions.map((option, idx) => (
                  <Input
                    key={idx}
                    placeholder={`Option ${idx + 1}`}
                    value={option}
                    onChange={(e) => updatePollOption(idx, e.target.value)}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={addPollOption}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ajouter une option
              </Button>
            </div>
            <Button
              onClick={handleCreatePoll}
              disabled={isPending}
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            >
              {isPending ? "Création..." : "Créer le sondage"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
