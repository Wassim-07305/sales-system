"use client";

import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Send, Mic, MicOff, Instagram, MessageSquare, Upload, Bot, Plus, X, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendMessage, createConversation, importConversation, generateQuickReplies } from "@/lib/actions/inbox";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface DmMessage {
  sender: string;
  content: string;
  type: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  prospect_id: string | null;
  platform: string;
  messages: DmMessage[];
  last_message_at: string | null;
  prospect: { id: string; name: string; platform: string | null; status: string } | null;
}

interface Prospect {
  id: string;
  name: string;
  platform: string | null;
  status: string;
}

export function InboxView({ conversations, prospects }: { conversations: Conversation[]; prospects: Prospect[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(conversations[0] || null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv]);

  const filteredConvs = conversations.filter((c) =>
    !search || c.prospect?.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSend() {
    if (!messageText.trim() || !selectedConv) return;
    await sendMessage(selectedConv.id, messageText);
    setMessageText("");
    router.refresh();
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
    await importConversation(importProspectId, prospect?.platform || "instagram", importText);
    toast.success("Conversation importée");
    setImportDialogOpen(false);
    setImportText("");
    router.refresh();
  }

  async function handleNewConversation() {
    if (!newConvProspectId) return;
    const prospect = prospects.find((p) => p.id === newConvProspectId);
    await createConversation(newConvProspectId, prospect?.platform || "instagram");
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
      const lastMessages = msgs.slice(-3).map((m) => `${m.sender}: ${m.content}`).join("\n");
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
    toast.success("Vocal IA programmé (en attente d'intégration ElevenLabs)");
    setVoiceAiDialogOpen(false);
    setVoiceAiText("");
  }

  return (
    <div>
      <PageHeader title="Inbox" description="Conversations avec vos prospects">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
          <Button onClick={() => setNewConvDialogOpen(true)} className="bg-brand text-brand-dark hover:bg-brand/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle conversation
          </Button>
        </div>
      </PageHeader>

      <div className="grid md:grid-cols-[350px_1fr] gap-4 h-[calc(100dvh-220px)] md:h-[calc(100dvh-200px)]">
        {/* Conversation list */}
        <Card className={cn("flex flex-col overflow-hidden", selectedConv ? "hidden md:flex" : "flex")}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">
                      {conv.prospect?.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{conv.prospect?.name || "Inconnu"}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0 ml-1">
                          <Instagram className="h-2.5 w-2.5 mr-0.5" />
                          {conv.platform}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {lastMsg?.content || "Aucun message"}
                      </p>
                      {conv.last_message_at && (
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredConvs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
                Aucune conversation
              </div>
            )}
          </div>
        </Card>

        {/* Messages area */}
        <Card className={cn("flex flex-col overflow-hidden", !selectedConv && "hidden md:flex")}>
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
                  <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                    {selectedConv.prospect?.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedConv.prospect?.name || "Inconnu"}</p>
                    <Badge variant="outline" className="text-[10px]">{selectedConv.platform}</Badge>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(selectedConv.messages || []).map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === "damien" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                      msg.sender === "damien"
                        ? "bg-brand text-brand-dark rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}>
                      {msg.type === "voice" ? (
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4" />
                          <span>Message vocal</span>
                        </div>
                      ) : (
                        msg.content
                      )}
                      <p className={`text-[10px] mt-1 ${msg.sender === "damien" ? "text-brand-dark/60" : "text-muted-foreground"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions IA */}
              {suggestions.length > 0 && (
                <div className="px-3 pt-2 flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setMessageText(s); setSuggestions([]); }}
                      className="text-xs bg-brand/10 text-brand-dark hover:bg-brand/20 rounded-full px-3 py-1.5 text-left max-w-[300px] truncate transition-colors"
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
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleQuickReplies}
                  disabled={loadingSuggestions}
                  title="Suggestions IA"
                >
                  {loadingSuggestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={isRecording ? "text-red-500 border-red-500" : ""}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVoiceAiDialogOpen(true)}
                  title="Vocal IA"
                >
                  <Bot className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleSend} className="bg-brand text-brand-dark hover:bg-brand/90">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
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
              <Select value={importProspectId} onValueChange={setImportProspectId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un prospect" /></SelectTrigger>
                <SelectContent>
                  {prospects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Collez la conversation (alternance prospect/Damien par ligne)</Label>
              <Textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={8} placeholder="Salut, j'ai vu ton profil...&#10;Merci ! Oui je suis intéressé...&#10;..." />
            </div>
            <Button onClick={handleImport} className="w-full bg-brand text-brand-dark hover:bg-brand/90">Importer</Button>
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
              <Select value={newConvProspectId} onValueChange={setNewConvProspectId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un prospect" /></SelectTrigger>
                <SelectContent>
                  {prospects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.platform})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleNewConversation} className="w-full bg-brand text-brand-dark hover:bg-brand/90">Créer</Button>
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
              <Textarea value={voiceAiText} onChange={(e) => setVoiceAiText(e.target.value)} rows={4} placeholder="Salut ! Je voulais te proposer..." />
            </div>
            <div>
              <Label>Heure d&apos;envoi programmé</Label>
              <Input type="datetime-local" value={voiceAiSchedule} onChange={(e) => setVoiceAiSchedule(e.target.value)} />
            </div>
            <Button onClick={handleVoiceAi} className="w-full bg-brand text-brand-dark hover:bg-brand/90">Programmer le vocal</Button>
            <p className="text-xs text-muted-foreground text-center">
              L&apos;intégration ElevenLabs sera activée prochainement.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
