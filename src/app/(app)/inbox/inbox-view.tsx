"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Search,
  Send,
  Mic,
  MicOff,
  Instagram,
  Linkedin,
  MessageSquare,
  Upload,
  Bot,
  Plus,
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
  Flame,
  Thermometer,
  Snowflake,
  Eye,
  ArrowRightCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  sendMessage,
  createConversation,
  importConversation,
  generateQuickReplies,
} from "@/lib/actions/inbox";
import { escalateToHuman } from "@/lib/actions/automation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface DmMessage {
  sender: string;
  content: string;
  type: string;
  timestamp: string;
  metadata?: { source?: string; ai_mode?: string; step?: string } | null;
}

interface ProspectScore {
  total_score: number;
  temperature: string;
}

interface Conversation {
  id: string;
  prospect_id: string | null;
  platform: string;
  messages: DmMessage[];
  last_message_at: string | null;
  prospect: {
    id: string;
    name: string;
    platform: string | null;
    status: string;
  } | null;
  prospect_score: ProspectScore | null;
}

interface Prospect {
  id: string;
  name: string;
  platform: string | null;
  status: string;
}

interface PipelineStage {
  id: string;
  name: string;
}

const statusLabels: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  replied: "Répondu",
  booked: "Booké",
  qualified: "Qualifié",
  converted: "Converti",
  lost: "Perdu",
  not_interested: "Pas intéressé",
};

const statusColors: Record<string, string> = {
  new: "bg-muted/50 text-muted-foreground",
  contacted: "bg-foreground/10 text-foreground",
  replied: "bg-emerald-500/10 text-emerald-500",
  booked: "bg-emerald-500/15 text-emerald-500",
  qualified: "bg-emerald-500/15 text-emerald-500",
  converted: "bg-emerald-500/10 text-emerald-500",
  lost: "bg-muted/40 text-muted-foreground/60",
  not_interested: "bg-muted/40 text-muted-foreground/60",
};

const tempConfig: Record<string, { icon: typeof Flame; color: string; label: string }> = {
  hot: { icon: Flame, color: "text-red-500", label: "Chaud" },
  warm: { icon: Thermometer, color: "text-orange-500", label: "Tiède" },
  cold: { icon: Snowflake, color: "text-blue-400", label: "Froid" },
};

export function InboxView({
  conversations: initialConversations,
  prospects,
  stages = [],
}: {
  conversations: Conversation[];
  prospects: Prospect[];
  stages?: PipelineStage[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(
    initialConversations[0] || null,
  );
  const [messageText, setMessageText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [voiceAiDialogOpen, setVoiceAiDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importProspectId, setImportProspectId] = useState("");
  const [voiceAiText, setVoiceAiText] = useState("");
  const [voiceAiSchedule, setVoiceAiSchedule] = useState("");
  const [newConvDialogOpen, setNewConvDialogOpen] = useState(false);
  const [newConvProspectId, setNewConvProspectId] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConv, scrollToBottom]);

  // Supabase Realtime: subscribe to dm_conversations changes for the selected conversation
  useEffect(() => {
    if (!selectedConv) return;

    const subscription = supabase
      .channel(`dm_conversations:${selectedConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_conversations",
          filter: `id=eq.${selectedConv.id}`,
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            messages: DmMessage[];
            last_message_at: string | null;
          };
          // Update the selected conversation with new messages
          setSelectedConv((prev) => {
            if (!prev || prev.id !== updated.id) return prev;
            return {
              ...prev,
              messages: updated.messages || prev.messages,
              last_message_at: updated.last_message_at ?? prev.last_message_at,
            };
          });
          // Also update the conversation in the sidebar list
          setConversations((prev) =>
            prev.map((c) =>
              c.id === updated.id
                ? {
                    ...c,
                    messages: updated.messages || c.messages,
                    last_message_at:
                      updated.last_message_at ?? c.last_message_at,
                  }
                : c,
            ),
          );
          setTimeout(scrollToBottom, 100);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedConv?.id, supabase, scrollToBottom]);

  // Supabase Realtime: subscribe to new conversations (INSERT) and updates across all conversations for sidebar
  useEffect(() => {
    const subscription = supabase
      .channel("dm_conversations:all")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_conversations",
        },
        () => {
          // A new conversation was created — refresh to get full data with prospect join
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_conversations",
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            messages: DmMessage[];
            last_message_at: string | null;
          };
          setConversations((prev) =>
            prev.map((c) =>
              c.id === updated.id
                ? {
                    ...c,
                    messages: updated.messages || c.messages,
                    last_message_at:
                      updated.last_message_at ?? c.last_message_at,
                  }
                : c,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase, router]);

  const platformFilters = [
    { value: "all", label: "Tous" },
    { value: "email", label: "Email" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "instagram", label: "Instagram" },
  ];

  const filteredConvs = conversations.filter((c) => {
    const matchesSearch =
      !search || c.prospect?.name.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform =
      platformFilter === "all" ||
      c.platform.toLowerCase() === platformFilter.toLowerCase();
    return matchesSearch && matchesPlatform;
  });

  async function handleSend() {
    if (!messageText.trim() || !selectedConv) return;
    const text = messageText;
    setMessageText("");
    await sendMessage(selectedConv.id, text);
    // Realtime subscription will update the messages automatically
  }

  async function handleStartRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        new Blob(chunks, { type: "audio/webm" });
        // For now, send as text note about voice
        if (selectedConv) {
          await sendMessage(selectedConv.id, "[Message vocal]", "voice");
          router.refresh();
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Impossible d'accéder au micro");
    }
  }

  function handleStopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function handleImport() {
    if (!importProspectId || !importText.trim()) return;
    const prospect = prospects.find((p) => p.id === importProspectId);
    await importConversation(
      importProspectId,
      prospect?.platform || "instagram",
      importText,
    );
    toast.success("Conversation importée");
    setImportDialogOpen(false);
    setImportText("");
    router.refresh();
  }

  async function handleNewConversation() {
    if (!newConvProspectId) return;
    const prospect = prospects.find((p) => p.id === newConvProspectId);
    await createConversation(
      newConvProspectId,
      prospect?.platform || "instagram",
    );
    toast.success("Conversation créée");
    setNewConvDialogOpen(false);
    router.refresh();
  }

  async function handleQuickReplies() {
    if (!selectedConv) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const msgs = selectedConv.messages || [];
      const lastMessages = msgs
        .slice(-3)
        .map((m) => `${m.sender}: ${m.content}`)
        .join("\n");
      const prospectName = selectedConv.prospect?.name || "le prospect";
      const result = await generateQuickReplies(lastMessages, prospectName);
      setSuggestions(result.suggestions);
    } catch {
      toast.error("Impossible de générer les suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleVoiceAi() {
    toast.info(
      "Fonctionnalité Vocal IA en cours de développement — intégration ElevenLabs à venir.",
    );
    setVoiceAiDialogOpen(false);
    setVoiceAiText("");
  }

  async function handleEscalate() {
    if (!selectedConv) return;
    try {
      const result = await escalateToHuman(
        selectedConv.id,
        "Réponse complexe — intervention humaine requise",
      );
      if (result.success) {
        toast.success(
          "Conversation escaladée — notification envoyée au setter/manager",
        );
      } else {
        toast.error(result.error || "Erreur d'escalade");
      }
    } catch {
      toast.error("Erreur lors de l'escalade");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inbox" description="Conversations avec vos prospects">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-medium"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
          <Button
            onClick={() => setNewConvDialogOpen(true)}
            className="rounded-xl font-medium bg-emerald-500 text-black hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle conversation
          </Button>
        </div>
      </PageHeader>

      <div className="grid md:grid-cols-[350px_1fr] gap-4 h-[calc(100dvh-220px)] md:h-[calc(100dvh-200px)]">
        {/* Conversation list */}
        <Card
          className={cn(
            "flex flex-col overflow-hidden shadow-sm rounded-2xl border-border/50",
            selectedConv ? "hidden md:flex" : "flex",
          )}
        >
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9 h-9 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {platformFilters.map((pf) => (
                <button
                  key={pf.value}
                  onClick={() => setPlatformFilter(pf.value)}
                  className={cn(
                    "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                    platformFilter === pf.value
                      ? "bg-emerald-500 text-black border-emerald-500"
                      : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted",
                  )}
                >
                  {pf.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.map((conv) => {
              const lastMsg = conv.messages?.[conv.messages.length - 1];
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${selectedConv?.id === conv.id ? "bg-muted" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold shrink-0">
                      {conv.prospect?.name?.charAt(0) || "?"}
                      {conv.prospect_score?.temperature && (() => {
                        const tc = tempConfig[conv.prospect_score.temperature];
                        if (!tc) return null;
                        const TIcon = tc.icon;
                        return (
                          <span className={`absolute -top-1 -right-1 ${tc.color}`} title={tc.label}>
                            <TIcon className="h-3.5 w-3.5" />
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {conv.prospect?.name || "Inconnu"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {conv.prospect_score && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {conv.prospect_score.total_score}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                          >
                            {conv.platform === "linkedin" ? (
                              <Linkedin className="h-2.5 w-2.5 mr-0.5" />
                            ) : (
                              <Instagram className="h-2.5 w-2.5 mr-0.5" />
                            )}
                            {conv.platform}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {lastMsg?.content || "Aucun message"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {conv.prospect?.status && (
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", statusColors[conv.prospect.status])}>
                            {statusLabels[conv.prospect.status] || conv.prospect.status}
                          </Badge>
                        )}
                        {conv.last_message_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.last_message_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredConvs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-6 w-6 opacity-40" />
                </div>
                Aucune conversation
              </div>
            )}
          </div>
        </Card>

        {/* Messages area */}
        <Card
          className={cn(
            "flex flex-col overflow-hidden shadow-sm rounded-2xl border-border/50",
            !selectedConv && "hidden md:flex",
          )}
        >
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-3 md:p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConv(null)}
                    className="md:hidden p-1 -ml-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold">
                    {selectedConv.prospect?.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {selectedConv.prospect?.name || "Inconnu"}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedConv.platform}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedConv.prospect && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="rounded-xl font-medium gap-1.5"
                    >
                      <Link href={`/prospecting/${selectedConv.prospect.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-xs">Prospect</span>
                      </Link>
                    </Button>
                  )}
                  {selectedConv.prospect && !["booked", "converted"].includes(selectedConv.prospect.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="rounded-xl font-medium gap-1.5 text-emerald-500 hover:text-emerald-400/80"
                    >
                      <Link href={`/prospecting/${selectedConv.prospect.id}`}>
                        <ArrowRightCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-xs">Deal</span>
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEscalate}
                    className="rounded-xl font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1.5"
                    title="Escalader vers un humain"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">Escalader</span>
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(selectedConv.messages || []).map((msg, i) => {
                  const isAiSent =
                    msg.metadata?.source === "ai_auto_send" ||
                    msg.metadata?.source === "auto_relance";
                  return (
                    <div
                      key={i}
                      className={`flex ${msg.sender === "damien" ? "justify-end" : "justify-start"}`}
                    >
                      <div className="flex flex-col items-end gap-0.5">
                        {isAiSent && msg.sender === "damien" && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-0.5 text-[9px] px-1.5 py-0"
                          >
                            <Bot className="h-2.5 w-2.5" />
                            IA
                            {msg.metadata?.step
                              ? ` (${msg.metadata.step.toUpperCase()})`
                              : ""}
                          </Badge>
                        )}
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                            msg.sender === "damien"
                              ? "bg-emerald-500 text-black rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          }`}
                        >
                          {msg.type === "voice" ? (
                            <div className="flex items-center gap-2">
                              <Mic className="h-4 w-4" />
                              <span>Message vocal</span>
                            </div>
                          ) : (
                            msg.content
                          )}
                          <p
                            className={`text-[10px] mt-1 ${msg.sender === "damien" ? "text-black/60" : "text-muted-foreground"}`}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString(
                              "fr-FR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions IA */}
              {suggestions.length > 0 && (
                <div className="px-3 pt-2 flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setMessageText(s);
                        setSuggestions([]);
                      }}
                      className="text-xs bg-emerald-500/10 text-black hover:bg-emerald-500/20 rounded-full px-3 py-1.5 text-left max-w-[300px] truncate transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t flex items-center gap-2">
                <Input
                  placeholder="Écrire un message..."
                  className="flex-1"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSend()
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleQuickReplies}
                  disabled={loadingSuggestions}
                  title="Suggestions IA"
                >
                  {loadingSuggestions ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={
                    isRecording ? handleStopRecording : handleStartRecording
                  }
                  className={isRecording ? "text-emerald-500 border-emerald-500" : ""}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.info("Vocal IA — intégration ElevenLabs à venir.")
                  }
                  title="Vocal IA (bientôt disponible)"
                  disabled
                >
                  <Bot className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-7 w-7 opacity-40" />
                </div>
                <p className="font-medium">Sélectionnez une conversation</p>
                <p className="text-sm">ou créez-en une nouvelle</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer une conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prospect</Label>
              <Select
                value={importProspectId}
                onValueChange={setImportProspectId}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sélectionner un prospect" />
                </SelectTrigger>
                <SelectContent>
                  {prospects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Collez la conversation (alternance prospect/Damien par ligne)
              </Label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={8}
                className="rounded-xl"
                placeholder="Salut, j'ai vu ton profil...&#10;Merci ! Oui je suis intéressé...&#10;..."
              />
            </div>
            <Button
              onClick={handleImport}
              className="w-full rounded-xl font-medium bg-emerald-500 text-black hover:bg-emerald-400"
            >
              Importer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New conversation Dialog */}
      <Dialog open={newConvDialogOpen} onOpenChange={setNewConvDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prospect</Label>
              <Select
                value={newConvProspectId}
                onValueChange={setNewConvProspectId}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sélectionner un prospect" />
                </SelectTrigger>
                <SelectContent>
                  {prospects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleNewConversation}
              className="w-full rounded-xl font-medium bg-emerald-500 text-black hover:bg-emerald-400"
            >
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voice AI Dialog */}
      <Dialog open={voiceAiDialogOpen} onOpenChange={setVoiceAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vocal IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tape ton message, l&apos;IA le transformera en vocal avec ta voix.
            </p>
            <div>
              <Label>Message</Label>
              <Textarea
                value={voiceAiText}
                onChange={(e) => setVoiceAiText(e.target.value)}
                rows={4}
                className="rounded-xl"
                placeholder="Salut ! Je voulais te proposer..."
              />
            </div>
            <div>
              <Label>Heure d&apos;envoi programmé</Label>
              <Input
                type="datetime-local"
                value={voiceAiSchedule}
                onChange={(e) => setVoiceAiSchedule(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <Button
              onClick={handleVoiceAi}
              className="w-full rounded-xl font-medium bg-emerald-500 text-black hover:bg-emerald-400"
            >
              Programmer le vocal
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              L&apos;intégration ElevenLabs sera activée prochainement.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
